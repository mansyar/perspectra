import type { Env } from '../env';

export type EmbeddingPurpose = 'document' | 'query';

export interface LlmPort {
  embed(texts: readonly string[], purpose?: EmbeddingPurpose): Promise<number[][]>;
  complete(prompt: string): Promise<string>;
}

const DEFAULT_CHAT_MODEL = 'gemini-3.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-2';
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents';

interface ChatPayload {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing Worker binding: ${name}`);
  }
  return value;
}

function validateEmbeddingModel(model: string | undefined): void {
  if (model === undefined) {
    return;
  }
  const normalized = model.replace(/^models\//, '');
  if (normalized !== EMBEDDING_MODEL) {
    throw new Error(`Unsupported EMBEDDING_MODEL: ${model}. Only ${EMBEDDING_MODEL} is supported.`);
  }
}

function formatEmbeddingText(text: string, purpose: EmbeddingPurpose): string {
  return purpose === 'document'
    ? `title: none | text: ${text}`
    : `task: question answering | query: ${text}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEmbedding(value: unknown, index: number): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed embedding response: row ${index} is not a numeric vector`);
  }
  if (value.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Malformed embedding response: row ${index} expected ${EMBEDDING_DIMENSIONS} dimensions, received ${value.length}`,
    );
  }

  const vector: number[] = [];
  let scale = 0;
  for (const component of value) {
    if (typeof component !== 'number' || !Number.isFinite(component)) {
      throw new Error(
        `Malformed embedding response: row ${index} must contain only finite numbers`,
      );
    }
    vector.push(component);
    scale = Math.max(scale, Math.abs(component));
  }
  if (scale === 0) {
    throw new Error(`Malformed embedding response: row ${index} has zero norm`);
  }

  let scaledSquaredNorm = 0;
  for (const component of vector) {
    scaledSquaredNorm += (component / scale) ** 2;
  }
  const scaledNorm = Math.sqrt(scaledSquaredNorm);
  return vector.map((component) => component / scale / scaledNorm);
}

/**
 * Chat and embeddings both use Gemini. Embeddings are task-formatted, requested
 * at 1536 dimensions, validated, and normalized before they reach the fixed
 * pgvector column, so incompatible embedding spaces cannot be configured.
 *
 * complete() returns the full upstream answer. The Worker validates citations
 * on that complete text ("validate before stream") and only then emits paced
 * SSE deltas, so an invalid or ungrounded answer is never partially streamed.
 */
export function createLlmAdapter(env: Env): LlmPort {
  const provider = env.LLM_PROVIDER ?? 'gemini';
  if (provider !== 'gemini') {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}. Only gemini is supported.`);
  }
  validateEmbeddingModel(env.EMBEDDING_MODEL);

  return {
    async embed(
      texts: readonly string[],
      purpose: EmbeddingPurpose = 'query',
    ): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }
      const key = required(
        env.EMBEDDING_API_KEY ?? env.LLM_API_KEY,
        'EMBEDDING_API_KEY or LLM_API_KEY',
      );
      const response = await fetch(EMBEDDING_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text: formatEmbeddingText(text, purpose) }] },
            outputDimensionality: EMBEDDING_DIMENSIONS,
          })),
        }),
      });
      if (!response.ok) {
        throw new Error(`Embedding request failed with status ${response.status}`);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Malformed embedding response: invalid JSON');
      }
      if (!isRecord(payload) || !Array.isArray(payload.embeddings)) {
        throw new Error('Malformed embedding response: expected an embeddings array');
      }
      const rows = payload.embeddings;
      if (rows.length !== texts.length) {
        throw new Error(
          `Embedding response row count mismatch: expected ${texts.length}, received ${rows.length}`,
        );
      }
      return rows.map((row, index) => {
        if (!isRecord(row)) {
          throw new Error(`Malformed embedding response: row ${index} is not an object`);
        }
        return normalizeEmbedding(row.values, index);
      });
    },

    async complete(prompt: string): Promise<string> {
      const key = required(env.LLM_API_KEY, 'LLM_API_KEY');
      const model = env.LLM_MODEL ?? DEFAULT_CHAT_MODEL;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }], role: 'user' }],
            generationConfig: {
              maxOutputTokens: 400,
              temperature: 1,
              thinkingConfig: { thinkingLevel: 'minimal' },
            },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }
      const payload = (await response.json()) as ChatPayload;
      const parts = payload.candidates?.[0]?.content?.parts ?? [];
      return parts.map((part) => part.text ?? '').join('');
    },
  };
}
