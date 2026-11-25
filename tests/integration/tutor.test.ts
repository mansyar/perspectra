import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../api/src';
import type { AuthPort } from '../../api/src/lib/auth';
import { InMemoryKv } from '../../api/src/lib/kv';
import type { LessonChunkRepository } from '../../api/src/lib/lesson-chunk-repository';
import type { LlmPort } from '../../api/src/lib/llm';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';
import type { LessonChunk } from '../../api/src/lib/retrieval';
import type { TutorEvent } from '../../api/src/routes/tutor';
import { EARTH_LESSON } from '../fixtures/lessons';

const chunks: LessonChunk[] = [
  {
    hotspotId: 'aorta',
    id: 'heart:aorta:overview',
    layer: 'overview',
    lessonId: 'heart',
    text: 'The aorta carries oxygenated blood from the left ventricle.',
  },
];

const earthChunks: LessonChunk[] = EARTH_LESSON.hotspots.map((hotspotId) => ({
  embedding: [1, 0],
  hotspotId,
  id: `${EARTH_LESSON.id}:${hotspotId}:overview`,
  layer: 'overview',
  lessonId: EARTH_LESSON.id,
  text:
    hotspotId === 'outer_core'
      ? 'The liquid outer core is mostly iron and nickel.'
      : `Earth's ${hotspotId} is part of its layered interior.`,
}));

function chunk(overrides: Partial<LessonChunk> = {}): LessonChunk {
  return {
    hotspotId: 'aorta',
    id: 'heart:aorta:overview',
    layer: 'overview',
    lessonId: 'heart',
    text: 'The aorta carries oxygenated blood from the left ventricle.',
    ...overrides,
  };
}

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

  it('ranks embedded chunks by cosine and rejects low similarity before generation', async () => {
    const embedded: LessonChunk[] = [chunk({ embedding: [1, 0] })];
    const llm = llmFor('Blood flows [[heart:aorta:overview]].');
    const app = createApp({
      auth: authFor(null),
      db: new InMemoryProgressRepository(),
      getChunks: () => embedded,
      kv: new InMemoryKv(),
      llm,
    });
    const accepted = parseSse(await (await post(app, { sessionId: 'cosine-ok' })).text());
    expect(accepted.at(-1)).toEqual({ citations: ['heart:aorta:overview'], type: 'done' });

    const rejectedComplete = vi.fn(async (_prompt: string) => 'unexpected answer');
    const orthogonal: LlmPort = {
      complete: rejectedComplete,
      async embed() {
        return [[0, 1]];
      },
    };
    const rejectedApp = createApp({
      auth: authFor(null),
      db: new InMemoryProgressRepository(),
      getChunks: () => embedded,
      kv: new InMemoryKv(),
      llm: orthogonal,
    });
    const rejected = parseSse(await (await post(rejectedApp, { sessionId: 'cosine-low' })).text());
    expect(rejected[0]).toMatchObject({ code: 'no_context', type: 'error' });
    expect(rejectedComplete).not.toHaveBeenCalled();
  });

  it('serves a second lesson through the injectable chunk repository', async () => {
    const brainChunk = chunk({
      hotspotId: 'cortex',
      id: 'brain:cortex:overview',
      lessonId: 'brain',
      text: 'The cortex processes sensory signals.',
      embedding: [1, 0],
    });
    const repository: LessonChunkRepository = {
      async getChunks(lessonId: string) {
        return lessonId === 'brain' ? [brainChunk] : chunks;
      },
    };
    const llm = llmFor('Signals are processed [[brain:cortex:overview]].');
    const app = createApp({
      auth: authFor(null),
      db: new InMemoryProgressRepository(),
      getChunks: (lessonId) => repository.getChunks(lessonId),
      kv: new InMemoryKv(),
      llm,
    });
    const response = await post(app, {
      lessonId: 'brain',
      question: 'What does the cortex do?',
      sessionId: 'brain-1',
    });
    const events = parseSse(await response.text());
    expect(events.at(-1)).toEqual({ citations: ['brain:cortex:overview'], type: 'done' });
  });

  it('serves a second lesson through the production chunk repository path', async () => {
    const cortexChunk = chunk({
      hotspotId: 'cortex',
      id: 'brain:cortex:overview',
      lessonId: 'brain',
      text: 'The cortex processes sensory signals.',
      embedding: [1, 0],
    });
    const repository: LessonChunkRepository = {
      async getChunks(lessonId: string) {
        return lessonId === 'brain' ? [cortexChunk] : chunks;
      },
    };
    const llm = llmFor('Signals are processed [[brain:cortex:overview]].');
    const app = createApp({
      auth: authFor(null),
      chunkRepository: repository,
      db: new InMemoryProgressRepository(),
      kv: new InMemoryKv(),
      llm,
      // Deliberately no getChunks: this must exercise the production lookup.
    });
    const response = await post(app, {
      lessonId: 'brain',
      question: 'cortex signals',
      sessionId: 'brain-production',
    });
    const events = parseSse(await response.text());
    expect(events.at(-1)).toEqual({ citations: ['brain:cortex:overview'], type: 'done' });
  });

  it('retrieves Earth chunks through production lookup and streams Earth citations', async () => {
    const repository: LessonChunkRepository = {
      async getChunks(lessonId: string) {
        return lessonId === EARTH_LESSON.id ? earthChunks : chunks;
      },
    };
    const llm = llmFor(
      'The outer core is liquid iron and nickel [[earth-interior:outer_core:overview]].',
    );
    const app = createApp({
      auth: authFor(null),
      chunkRepository: repository,
      db: new InMemoryProgressRepository(),
      kv: new InMemoryKv(),
      llm,
    });
    const response = await post(app, {
      lessonId: EARTH_LESSON.id,
      question: 'Why is the outer core liquid?',
      sessionId: 'earth-retrieval',
    });
    const events = parseSse(await response.text());
    expect(events.at(-1)).toEqual({
      citations: ['earth-interior:outer_core:overview'],
      type: 'done',
    });
    expect(llm.complete).toHaveBeenCalledOnce();
    expect(llm.complete.mock.calls[0]?.[0]).toContain(
      'The liquid outer core is mostly iron and nickel.',
    );
    expect(llm.complete.mock.calls[0]?.[0]).not.toMatch(/heart|aorta|anatomy|clinical/i);
  });

  it('rejects off-topic Earth questions with an Earth static excerpt', async () => {
    const llm = llmFor('unexpected');
    const app = createApp({
      auth: authFor(null),
      db: new InMemoryProgressRepository(),
      getChunks: () => earthChunks,
      kv: new InMemoryKv(),
      llm,
    });
    const events = parseSse(
      await (
        await post(app, {
          lessonId: EARTH_LESSON.id,
          question: 'Tell me a joke',
          sessionId: 'earth-off-topic',
        })
      ).text(),
    );
    expect(events[0]).toMatchObject({ code: 'off_topic', type: 'error' });
    expect(events[0]?.staticExcerpt).toContain('crust');
    expect(events[0]?.staticExcerpt).not.toMatch(/heart|aorta/i);
    expect(llm.complete).not.toHaveBeenCalled();
    expect(llm.embed).not.toHaveBeenCalled();
  });

  it('falls back to Earth prose when a tutor answer has an invalid citation', async () => {
    const llm = llmFor('Unsupported claim [[earth-interior:missing:overview]].');
    const app = createApp({
      auth: authFor(null),
      db: new InMemoryProgressRepository(),
      getChunks: () => earthChunks,
      kv: new InMemoryKv(),
      llm,
    });
    const events = parseSse(
      await (
        await post(app, {
          lessonId: EARTH_LESSON.id,
          question: 'What is the outer core?',
          sessionId: 'earth-citation',
        })
      ).text(),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ code: 'invalid_citation', type: 'error' });
    expect(events[0]?.staticExcerpt).toContain('crust');
    expect(events[0]?.staticExcerpt).not.toMatch(/heart|aorta/i);
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
