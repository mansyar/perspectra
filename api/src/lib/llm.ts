import type { Env } from '../env';

export interface LlmPort {
  embed(texts: readonly string[]): Promise<number[][]>;
  complete(prompt: string): Promise<string>;
}

type ChatProvider = 'gemini' | 'openai';

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing Worker binding: ${name}`);
  }
  return value;
}

interface EmbeddingPayload {
  data?: { index: number; embedding: number[] }[];
}

interface ChatPayload {
  choices?: { message?: { content?: string } }[];
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * Chat generation is provider-configurable (Gemini by default, OpenAI optional).
 * Embeddings are deliberately OpenAI-compatible for BOTH providers: the fixed
 * pgvector column is vector(1536), so the embedding endpoint and dimensions do
 * not vary with the chat provider.
 *
 * complete() returns the full upstream answer. The Worker validates citations
 * on that complete text ("validate before stream") and only then emits paced
 * SSE deltas, so an invalid or ungrounded answer is never partially streamed.
 */
export function createLlmAdapter(env: Env): LlmPort {
  const provider: ChatProvider = env.LLM_PROVIDER === 'openai' ? 'openai' : 'gemini';

  return {
    async embed(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }
      const key = required(
        env.EMBEDDING_API_KEY ?? (provider === 'openai' ? env.LLM_API_KEY : undefined),
        'EMBEDDING_API_KEY',
      );
      const model = env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ dimensions: 1536, input: [...texts], model }),
      });
      if (!response.ok) {
        throw new Error(`Embedding request failed with status ${response.status}`);
      }
      const payload = (await response.json()) as EmbeddingPayload;
      return (payload.data ?? [])
        .toSorted((left, right) => left.index - right.index)
        .map((row) => row.embedding);
    },

    async complete(prompt: string): Promise<string> {
      const key = required(env.LLM_API_KEY, 'LLM_API_KEY');

      if (provider === 'openai') {
        const model = env.LLM_MODEL ?? 'gpt-4.1-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            max_tokens: 400,
            messages: [{ content: prompt, role: 'user' }],
            model,
            temperature: 0,
          }),
        });
        if (!response.ok) {
          throw new Error(`Chat request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as ChatPayload;
        return payload.choices?.[0]?.message?.content ?? '';
      }

      const model = env.LLM_MODEL ?? 'gemini-2.5-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }], role: 'user' }],
            generationConfig: { maxOutputTokens: 400, temperature: 0 },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }
      const payload = (await response.json()) as ChatPayload;
      return (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('');
    },
  };
}
