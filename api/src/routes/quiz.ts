import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import type { AuthPort } from '../lib/auth';
import { hmacSha256 } from '../lib/badge';
import { computeMastery, recommendNext, type MasteryView } from '../lib/mastery';
import type { KvPort } from '../lib/kv';
import type { LlmPort } from '../lib/llm';
import type { ProgressRepository } from '../lib/progress-repository';
import { DEFAULT_HOTSPOTS, HEART_LESSON_MDX } from '../lib/retrieval';

export interface QuizDeps {
  db: ProgressRepository;
  auth: AuthPort;
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

const generatedSchema = z.object({
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  hotspotId: z.string().refine((value) => isHotspot(value)),
  id: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  question: z.string().min(1),
  remediationId: z.string().refine((value) => isHotspot(value)),
});

type GeneratedQuestion = z.infer<typeof generatedSchema>;

interface StoredQuestion {
  lessonId: string;
  question: GeneratedQuestion;
  signature: string;
  userid: string;
}

function isHotspot(value: string): boolean {
  return (DEFAULT_HOTSPOTS as readonly string[]).includes(value);
}

function hotspotSection(mdx: string, hotspotId: string): string {
  const escaped = hotspotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<div\\b[^>]*data-hotspot=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/div>`,
  );
  return pattern.exec(mdx)?.[0] ?? '';
}

/** The entire generation contract is in the prompt; the reply must be bare JSON. */
export function buildQuizPrompt(lessonId: string, hotspotId?: string): string {
  const target = hotspotId && isHotspot(hotspotId) ? hotspotId : undefined;
  const source = target ? hotspotSection(HEART_LESSON_MDX, target) : HEART_LESSON_MDX;
  return [
    'You write one multiple-choice check for understanding for anatomy learners.',
    `Lesson: ${lessonId}`,
    `Target hotspot: ${target ?? 'any landmark in this lesson'}`,
    'Use only the source prose below. Do not invent clinical claims.',
    'Return JSON only, with exactly these keys:',
    '{ id, hotspotId, question, options: string[4], answerIndex: 0|1|2|3, explanation, remediationId }',
    `hotspotId and remediationId must be one of: ${DEFAULT_HOTSPOTS.join(', ')}`,
    'The explanation is shown only after the learner answers.',
    '',
    'SOURCE PROSE:',
    source || '(no matching prose)',
  ].join('\n');
}

function parseGeneration(raw: string): GeneratedQuestion | null {
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
  const result = generatedSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

async function masteryFor(deps: QuizDeps, userId: string): Promise<MasteryResponse> {
  const mastery = computeMastery(await deps.db.getEvents(userId), DEFAULT_HOTSPOTS);
  const soon = Date.now() + 60_000;
  const dueCards = mastery.hotspots
    .filter((hotspot) => hotspot.dueAt !== null && Date.parse(hotspot.dueAt) <= soon)
    .map((hotspot) => hotspot.hotspotId);
  return { ...mastery, dueCards, nextHotspot: recommendNext(mastery) };
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
    if (!parsed.success || (parsed.data.hotspotId && !isHotspot(parsed.data.hotspotId))) {
      return c.json({ error: 'invalid_request' }, 400);
    }
    const body = parsed.data;

    let generated: GeneratedQuestion | null = null;
    try {
      const raw = await resolved.llm.complete(buildQuizPrompt(body.lessonId, body.hotspotId));
      generated = parseGeneration(raw);
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
      userid: identity.userId,
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
    if (record.userid !== identity.userId || record.signature !== expected) {
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
    const mastery = await masteryFor(resolved, identity.userId);

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
  return c.json(await masteryFor(resolved, identity.userId));
}

/** Mounted at /api/mastery so the heatmap and the quiz share one view. */
export function masteryRoutes(deps: QuizDeps | QuizDepsResolver): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();
  app.get('/', (c) => masteryHandler(c, deps));
  return app;
}
