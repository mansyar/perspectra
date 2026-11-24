import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../api/src';
import type { AuthPort } from '../../api/src/lib/auth';
import { InMemoryKv } from '../../api/src/lib/kv';
import type { LlmPort } from '../../api/src/lib/llm';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';
import type { LessonChunk } from '../../api/src/lib/retrieval';
import type { TutorEvent } from '../../api/src/routes/tutor';

const chunks: LessonChunk[] = [
  {
    hotspotId: 'aorta',
    id: 'heart:aorta:overview',
    layer: 'overview',
    lessonId: 'heart',
    text: 'The aorta carries oxygenated blood from the left ventricle.',
  },
];

function parseSse(text: string): TutorEvent[] {
  return text
    .split('\n\n')
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const line = block.split('\n').find((entry) => entry.startsWith('data:'));
      if (!line) {
        throw new Error(`Malformed SSE block: ${block}`);
      }
      return JSON.parse(line.slice(5).trim()) as TutorEvent;
    });
}

function authFor(userId: string | null): AuthPort {
  return {
    async getSession() {
      return userId ? { userId } : null;
    },
    async handler() {
      return new Response('unsupported');
    },
  };
}

function llmFor(answer: string) {
  const complete = vi.fn(async (_prompt: string) => answer);
  const embed = vi.fn(async (_texts: readonly string[]) => [[1, 0]]);
  return { complete, embed } satisfies LlmPort;
}

function appFor(options: { answer?: string; userId?: string | null } = {}) {
  const llm = llmFor(options.answer ?? 'Blood flows through the aorta [[heart:aorta:overview]].');
  const app = createApp({
    auth: authFor(options.userId ?? null),
    db: new InMemoryProgressRepository(),
    getChunks: () => chunks,
    kv: new InMemoryKv(),
    llm,
  });
  return { app, llm };
}

function post(app: ReturnType<typeof createApp>, body: Record<string, unknown>): Promise<Response> {
  return Promise.resolve(
    app.request('/api/tutor', {
      body: JSON.stringify({ lessonId: 'heart', question: 'What does the aorta do?', ...body }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }),
  );
}

describe('tutor route', () => {
  it('rejects off-topic questions before any generation', async () => {
    const { app, llm } = appFor();
    const response = await post(app, { question: 'Tell me a joke' });
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const events = parseSse(await response.text());
    expect(events[0]).toMatchObject({ code: 'off_topic', type: 'error' });
    expect(events[0].staticExcerpt).toContain('aorta');
    expect(llm.complete).not.toHaveBeenCalled();
    expect(llm.embed).not.toHaveBeenCalled();
  });

  it('asks anonymous learners to sign in on their third question', async () => {
    const { app } = appFor();
    await post(app, { sessionId: 'anon-1' });
    await post(app, { sessionId: 'anon-1' });
    const response = await post(app, { sessionId: 'anon-1' });
    const events = parseSse(await response.text());
    expect(events[0]).toMatchObject({ code: 'anon_limit', type: 'error' });
    expect(events[0].message).toContain('Sign in');
  });

  it('streams validated deltas followed by a done event with citations', async () => {
    const { app } = appFor();
    const response = await post(app, { sessionId: 'anon-2' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    const events = parseSse(await response.text());
    expect(events.filter((event) => event.type === 'delta').length).toBeGreaterThan(0);
    expect(events.at(-1)).toEqual({
      citations: ['heart:aorta:overview'],
      type: 'done',
    });
  });

  it('never streams an answer with an invalid citation', async () => {
    const { app } = appFor({ answer: 'Made up [[heart:missing:overview]].' });
    const response = await post(app, { sessionId: 'anon-3' });
    const events = parseSse(await response.text());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ code: 'invalid_citation', type: 'error' });
    expect(events[0].staticExcerpt).toContain('aorta');
  });

  it('blocks authenticated turn 17', async () => {
    const { app } = appFor({ userId: 'user-1' });
    const history = Array.from({ length: 16 }, (_, index) => ({
      content: `turn ${index}`,
      role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    }));
    const response = await post(app, { history });
    const events = parseSse(await response.text());
    expect(events[0]).toMatchObject({ code: 'turn_limit', type: 'error' });
  });

  it('returns an SSE error rather than throwing when the adapter fails', async () => {
    const failing: LlmPort = {
      async complete() {
        throw new Error('upstream down');
      },
      async embed() {
        return [];
      },
    };
    const app = createApp({
      auth: authFor(null),
      db: new InMemoryProgressRepository(),
      getChunks: () => chunks,
      kv: new InMemoryKv(),
      llm: failing,
    });
    const response = await post(app, { sessionId: 'anon-4' });
    const events = parseSse(await response.text());
    expect(events[0]).toMatchObject({ code: 'tutor_unavailable', type: 'error' });
  });
});
