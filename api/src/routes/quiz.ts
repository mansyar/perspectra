import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import type { AuthPort } from '../lib/auth';
import { hmacSha256 } from '../lib/badge';
import { computeMastery, recommendNext, type MasteryView } from '../lib/mastery';
import type { KvPort } from '../lib/kv';
import type { LlmPort } from '../lib/llm';
import type { ProgressRepository } from '../lib/progress-repository';
import { DEFAULT_HOTSPOTS, HEART_LESSON_MDX, hotspotIdsFromChunks } from '../lib/retrieval';
import type { ChunkSource } from './tutor';

export interface QuizDeps {
  db: ProgressRepository;
  auth: AuthPort;
  getChunks?: ChunkSource;
  kv: KvPort;
  llm: LlmPort;
  secret: string;
}

export type QuizDepsResolver = (env: Env) => QuizDeps;

export interface MasteryResponse extends MasteryView {
  nextHotspot: string | null;
  dueCards: string[];
}

const generateSchema = z.object({
  hotspotId: z.string().optional(),
  lessonId: z.string().min(1),
});

const gradeSchema = z.object({
  answerIndex: z.number().int().min(0).max(3),
  questionId: z.string().min(1),
});

function generatedSchemaFor(hotspots: readonly string[]) {
  const allowed = new Set(hotspots);
  const known = (value: string): boolean => allowed.has(value);
  return z.object({
    answerIndex: z.number().int().min(0).max(3),
    explanation: z.string().min(1),
    hotspotId: z.string().refine(known),
    id: z.string().min(1),
    options: z.array(z.string().min(1)).length(4),
    question: z.string().min(1),
    remediationId: z.string().refine(known),
  });
}

type GeneratedQuestion = z.infer<ReturnType<typeof generatedSchemaFor>>;

interface StoredQuestion {
  lessonId: string;
  question: GeneratedQuestion;
  signature: string;
  userId: string;
}

function includesHotspot(hotspots: readonly string[], value: string): boolean {
  return hotspots.includes(value);
}

function hotspotSection(mdx: string, hotspotId: string): string {
  const escaped = hotspotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<div\\b[^>]*data-hotspot=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/div>`,
  );
  return pattern.exec(mdx)?.[0] ?? '';
}

/**
 * Source prose and the hotspot vocabulary come from the same injectable chunk
 * source. Direct/dev callers without a source fall back to the heart mirror.
 */
async function lessonContext(
  deps: QuizDeps,
  body: z.infer<typeof generateSchema>,
): Promise<{ hotspots: readonly string[]; source: string }> {
  if (!deps.getChunks) {
    return {
      hotspots: DEFAULT_HOTSPOTS,
      source: body.hotspotId ? hotspotSection(HEART_LESSON_MDX, body.hotspotId) : HEART_LESSON_MDX,
    };
  }
  const all = await deps.getChunks(body.lessonId);
  const hotspots = hotspotIdsFromChunks(all);
  if (hotspots.length === 0) {
    return {
      hotspots: DEFAULT_HOTSPOTS,
      source: body.hotspotId ? hotspotSection(HEART_LESSON_MDX, body.hotspotId) : HEART_LESSON_MDX,
    };
  }
  const chunks = body.hotspotId ? all.filter((chunk) => chunk.hotspotId === body.hotspotId) : all;
  return {
    hotspots,
    source: chunks
      .map((chunk) => {
        return `<div data-hotspot="${chunk.hotspotId}"><p data-layer="${chunk.layer}">${chunk.text}</p></div>`;
      })
      .join('\n'),
  };
}

/** The entire generation contract is in the prompt; the reply must be bare JSON. */
export function buildQuizPrompt(
  lessonId: string,
  hotspotId?: string,
  sourceProse?: string,
  hotspots: readonly string[] = DEFAULT_HOTSPOTS,
): string {
  const target = hotspotId && includesHotspot(hotspots, hotspotId) ? hotspotId : undefined;
  const source =
    sourceProse ?? (target ? hotspotSection(HEART_LESSON_MDX, target) : HEART_LESSON_MDX);
  return [
    'You write one multiple-choice check for understanding.',
    `Lesson: ${lessonId}`,
    `Target hotspot: ${target ?? 'any hotspot in this lesson'}`,
    'Use only the source prose below. Do not invent facts beyond it.',
    'Return JSON only, with exactly these keys:',
    '{ id, hotspotId, question, options: string[4], answerIndex: 0|1|2|3, explanation, remediationId }',
    `hotspotId and remediationId must be one of: ${hotspots.join(', ')}`,
    'The explanation is shown only after the learner answers.',
    '',
    'SOURCE PROSE:',
    source || '(no matching prose)',
  ].join('\n');
}

function parseGeneration(raw: string, hotspots: readonly string[]): GeneratedQuestion | null {
  const bare = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(bare);
  } catch {
    return null;
  }
  const result = generatedSchemaFor(hotspots).safeParse(parsed);
  return result.success ? result.data : null;
}

/** Mastery vocabulary follows the lesson's chunk source, not the heart defaults. */
async function hotspotVocabulary(deps: QuizDeps, lessonId: string): Promise<string[]> {
  if (!deps.getChunks) {
    return [...DEFAULT_HOTSPOTS];
  }
  try {
    const hotspots = hotspotIdsFromChunks(await deps.getChunks(lessonId));
    return hotspots.length > 0 ? hotspots : [...DEFAULT_HOTSPOTS];
  } catch {
    return [...DEFAULT_HOTSPOTS];
  }
}

async function masteryFor(
  deps: QuizDeps,
  userId: string,
  lessonId: string,
): Promise<MasteryResponse> {
  const hotspots = await hotspotVocabulary(deps, lessonId);
  const mastery = computeMastery(await deps.db.getEvents(userId), hotspots);
  const soon = Date.now() + 60_000;
  const dueCards = mastery.hotspots
    .filter((hotspot) => hotspot.dueAt !== null && Date.parse(hotspot.dueAt) <= soon)
    .map((hotspot) => hotspot.hotspotId);
  return { ...mastery, dueCards, nextHotspot: recommendNext(mastery, hotspots) };
}

/** Quiz generation, grading, and the shared mastery view. All routes are session-scoped. */
export function quizRoutes(deps: QuizDeps | QuizDepsResolver): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();

  app.post('/generate', async (c) => {
    const resolved = typeof deps === 'function' ? deps(c.env) : deps;
    if (!resolved.secret) {
      return c.json({ error: 'not_configured' }, 503);
    }
    const identity = await resolved.auth.getSession(c.req.raw);
    if (!identity) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    const parsed = generateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_request' }, 400);
    }
    const body = parsed.data;

    let context: Awaited<ReturnType<typeof lessonContext>> | null = null;
    try {
      context = await lessonContext(resolved, body);
    } catch {
      context = null;
    }
    if (!context || (body.hotspotId && !includesHotspot(context.hotspots, body.hotspotId))) {
      return c.json({ error: 'invalid_request' }, 400);
    }

    let generated: GeneratedQuestion | null = null;
    try {
      const raw = await resolved.llm.complete(
        buildQuizPrompt(body.lessonId, body.hotspotId, context.source, context.hotspots),
      );
      generated = parseGeneration(raw, context.hotspots);
    } catch {
      generated = null;
    }
    if (!generated) {
      return c.json(
        {
          error: 'generation_failed',
          message: 'A question could not be generated. Please try again.',
        },
        502,
      );
    }

    const record: StoredQuestion = {
      lessonId: body.lessonId,
      question: generated,
      signature: await hmacSha256(
        resolved.secret,
        `${identity.userId}:${generated.id}:${generated.answerIndex}`,
      ),
      userId: identity.userId,
    };
    await resolved.kv.put(`quiz:${identity.userId}:${generated.id}`, JSON.stringify(record), 3600);

    // The answer index and explanation stay server-side until grade time.
    return c.json({
      hotspotId: generated.hotspotId,
      id: generated.id,
      lessonId: body.lessonId,
      options: generated.options,
      question: generated.question,
      remediationId: generated.remediationId,
    });
  });

  app.post('/grade', async (c) => {
    const resolved = typeof deps === 'function' ? deps(c.env) : deps;
    if (!resolved.secret) {
      return c.json({ error: 'not_configured' }, 503);
    }
    const identity = await resolved.auth.getSession(c.req.raw);
    if (!identity) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    const parsed = gradeSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_request' }, 400);
    }
    const { answerIndex, questionId } = parsed.data;
    const raw = await resolved.kv.get(`quiz:${identity.userId}:${questionId}`);
    if (raw === null) {
      return c.json(
        { error: 'question_expired', message: 'That question has expired. Generate a new one.' },
        404,
      );
    }

    let record: StoredQuestion;
    try {
      record = JSON.parse(String(raw)) as StoredQuestion;
    } catch {
      return c.json({ error: 'question_expired' }, 404);
    }
    const expected = await hmacSha256(
      resolved.secret,
      `${identity.userId}:${record.question?.id}:${record.question?.answerIndex}`,
    );
    if (record.userId !== identity.userId || record.signature !== expected) {
      return c.json({ error: 'question_expired' }, 404);
    }

    const correct = answerIndex === record.question.answerIndex;
    const event = {
      hotspotId: record.question.hotspotId,
      id: `quiz:${questionId}:${identity.userId}`,
      lessonId: record.lessonId,
      payload: { correct, questionId },
      timestamp: Date.now(),
      type: 'quiz_result' as const,
    };
    await resolved.db.appendEvents(identity.userId, [event]);
    const mastery = await masteryFor(resolved, identity.userId, record.lessonId);

    return c.json({
      correct,
      dueCards: mastery.dueCards,
      explanation: record.question.explanation,
      mastery,
      nextHotspot: mastery.nextHotspot,
      remediationId: record.question.remediationId,
    });
  });

  app.get('/mastery', (c) => masteryHandler(c, deps));
  return app;
}

async function masteryHandler(
  c: Context<{ Bindings: Env }>,
  deps: QuizDeps | QuizDepsResolver,
): Promise<Response> {
  const resolved = typeof deps === 'function' ? deps(c.env) : deps;
  const identity = await resolved.auth.getSession(c.req.raw);
  if (!identity) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  return c.json(await masteryFor(resolved, identity.userId, c.req.query('lessonId') ?? 'heart'));
}

/** Mounted at /api/mastery so the heatmap and the quiz share one view. */
export function masteryRoutes(deps: QuizDeps | QuizDepsResolver): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();
  app.get('/', (c) => masteryHandler(c, deps));
  return app;
}
