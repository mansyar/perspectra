import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../api/src/env';
import { createLlmAdapter } from '../../api/src/lib/llm';

const API_KEY = 'test-gemini-key';
const DIMENSIONS = 1536;
const EMBEDDING_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents';

function vector(x = 0, y = 0): number[] {
  const values = Array<number>(DIMENSIONS).fill(0);
  values[0] = x;
  values[1] = y;
  return values;
}

function stubFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function adapter(overrides: Partial<Env> = {}) {
  return createLlmAdapter({ LLM_API_KEY: API_KEY, ...overrides });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Gemini LLM adapter', () => {
  it('does not fetch for an empty embedding input', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLlmAdapter({}).embed([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends ordered Gemini batch requests with query formatting by default', async () => {
    const fetchMock = stubFetch({
      embeddings: [{ values: vector(1) }, { values: vector(0, 1) }],
    });

    await adapter().embed(['first question', 'second question']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(EMBEDDING_URL);
    expect(init).toMatchObject({
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      method: 'POST',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      requests: [
        {
          content: { parts: [{ text: 'task: question answering | query: first question' }] },
          model: 'models/gemini-embedding-2',
          outputDimensionality: DIMENSIONS,
        },
        {
          content: { parts: [{ text: 'task: question answering | query: second question' }] },
          model: 'models/gemini-embedding-2',
          outputDimensionality: DIMENSIONS,
        },
      ],
    });
    expect(url).not.toContain('api.openai.com');
  });

  it('uses document formatting when the caller requests it', async () => {
    const fetchMock = stubFetch({ embeddings: [{ values: vector(1) }] });

    await adapter().embed(['lesson passage'], 'document');

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      requests: [{ content: { parts: [{ text: 'title: none | text: lesson passage' }] } }],
    });
  });

  it('accepts a models/ embedding-model prefix but sends the canonical model', async () => {
    const fetchMock = stubFetch({ embeddings: [{ values: vector(1) }] });

    await adapter({ EMBEDDING_MODEL: 'models/gemini-embedding-2' }).embed(['query']);

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      requests: [{ model: 'models/gemini-embedding-2' }],
    });
  });

  it('prefers EMBEDDING_API_KEY over the fallback LLM_API_KEY', async () => {
    const fetchMock = stubFetch({ embeddings: [{ values: vector(1) }] });

    await adapter({ EMBEDDING_API_KEY: 'embedding-key' }).embed(['query']);

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      'content-type': 'application/json',
      'x-goog-api-key': 'embedding-key',
    });
  });

  it('preserves response order and normalizes every vector to unit L2 norm', async () => {
    stubFetch({
      embeddings: [{ values: vector(3, 4) }, { values: vector(0, -2) }],
    });

    const result = await adapter().embed(['first', 'second']);

    expect(result[0]?.[0]).toBeCloseTo(0.6);
    expect(result[0]?.[1]).toBeCloseTo(0.8);
    expect(result[1]?.[0]).toBeCloseTo(0);
    expect(result[1]?.[1]).toBeCloseTo(-1);
    for (const row of result) {
      expect(Math.sqrt(row.reduce((sum, value) => sum + value * value, 0))).toBeCloseTo(1);
    }
  });

  it.each([0, 1, 3])('rejects a response with %i rows for two inputs', async (rowCount) => {
    stubFetch({
      embeddings: Array.from({ length: rowCount }, () => ({ values: vector(1) })),
    });

    await expect(adapter().embed(['first', 'second'])).rejects.toThrow(
      'Embedding response row count mismatch',
    );
  });

  it('rejects vectors that do not have exactly 1536 dimensions', async () => {
    stubFetch({ embeddings: [{ values: vector(1).slice(0, DIMENSIONS - 1) }] });

    await expect(adapter().embed(['query'])).rejects.toThrow('expected 1536 dimensions');
  });

  it('rejects non-finite vector components', async () => {
    stubFetch({ embeddings: [{ values: vector(Number.NaN, 1) }] });

    await expect(adapter().embed(['query'])).rejects.toThrow('finite numbers');
  });

  it('rejects zero-norm vectors', async () => {
    stubFetch({ embeddings: [{ values: vector() }] });

    await expect(adapter().embed(['query'])).rejects.toThrow('zero norm');
  });

  it('rejects malformed embedding payloads', async () => {
    stubFetch({ embeddings: [{ values: 'not-a-vector' }] });

    await expect(adapter().embed(['query'])).rejects.toThrow('numeric vector');
  });

  it('rejects unsupported embedding models', () => {
    expect(() => adapter({ EMBEDDING_MODEL: 'text-embedding-3-small' })).toThrow(
      'Unsupported EMBEDDING_MODEL',
    );
  });

  it('rejects the OpenAI provider', () => {
    expect(() => adapter({ LLM_PROVIDER: 'openai' })).toThrow('LLM_PROVIDER');
  });

  it('requires an embedding key or the LLM key fallback', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLlmAdapter({}).embed(['query'])).rejects.toThrow(
      'EMBEDDING_API_KEY or LLM_API_KEY',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails clearly on a non-2xx embedding response', async () => {
    stubFetch({ error: 'unavailable' }, 503);

    await expect(adapter().embed(['query'])).rejects.toThrow(
      'Embedding request failed with status 503',
    );
  });

  it('keeps Gemini chat generation and joins returned text parts', async () => {
    const fetchMock = stubFetch({
      candidates: [{ content: { parts: [{ text: 'Grounded ' }, { text: 'answer' }] } }],
    });

    await expect(adapter().complete('lesson prompt')).resolves.toBe('Grounded answer');
    expect(fetchMock).toHaveBeenCalledWith(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'lesson prompt' }], role: 'user' }],
          generationConfig: { maxOutputTokens: 400, temperature: 0 },
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
    );
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('api.openai.com');
  });
});
