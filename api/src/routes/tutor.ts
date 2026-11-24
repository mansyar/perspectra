import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import type { AuthPort } from '../lib/auth';
import { classifyIntent } from '../lib/intent';
import type { KvPort } from '../lib/kv';
import type { LlmPort } from '../lib/llm';
import { assemblePrompt, stripCitations, validateCitations } from '../lib/prompt';
import { checkQuota } from '../lib/quota';
import {
  DEFAULT_HOTSPOTS,
  loadLessonChunks,
  retrieveChunks,
  type LessonChunk,
} from '../lib/retrieval';

export interface TutorEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  citations?: string[];
  code?: string;
  message?: string;
  staticExcerpt?: string;
}

export type ChunkSource = (
  lessonId: string,
  hotspots: readonly string[],
) => LessonChunk[] | Promise<LessonChunk[]>;

export interface TutorDeps {
  kv: KvPort;
  auth: AuthPort;
  llm?: LlmPort;
  getChunks?: ChunkSource;
}

/** Resolver form lets the Worker supply bindings at request time. */
export type TutorDepsResolver = (env: Env) => TutorDeps;

const tutorRequestSchema = z.object({
  activeHotspot: z.string().nullable().optional(),
  history: z
    .array(
      z.object({
        content: z.string().max(2000),
        role: z.enum(['user', 'assistant']),
      }),
    )
    .max(16)
    .optional(),
  lessonId: z.string().min(1),
  question: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
});

const LESSON_TERMS = [
  'heart',
  'cardiac',
  'blood',
  ...DEFAULT_HOTSPOTS.flatMap((id) => id.replaceAll('_', ' ').split(' ')),
];

const GENERIC_EXCERPT = 'The full lesson prose remains available below.';

function excerpt(chunks: readonly LessonChunk[]): string {
  const first = chunks[0];
  return first ? stripCitations(first.text).slice(0, 260) : GENERIC_EXCERPT;
}

function errorEvent(code: string, message: string, staticExcerpt: string): TutorEvent {
  return { code, message, staticExcerpt, type: 'error' };
}

function deltaEvents(answer: string): TutorEvent[] {
  const pieces = answer.match(/\S+\s*/g) ?? [answer];
  return pieces.map((text) => ({ text, type: 'delta' as const }));
}

function sseResponse(events: readonly TutorEvent[], pace = false): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          if (pace && event.type === 'delta') {
            await new Promise<void>((resolve) => setTimeout(resolve, 5));
          }
        }
        controller.close();
      },
    }),
    {
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/event-stream',
        'x-accel-buffering': 'no',
      },
      status: 200,
    },
  );
}

/**
 * Tutor endpoint. Every failure mode returns an SSE error plus a static prose
 * excerpt with HTTP 200, so a missing key, quota denial or bad generation can
 * never block the lesson itself (NFR-6).
 */
export function tutorRoutes(deps: TutorDeps | TutorDepsResolver): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();

  app.post('/', async (c) => {
    const resolved = typeof deps === 'function' ? deps(c.env) : deps;
    let staticExcerpt = GENERIC_EXCERPT;

    try {
      const parsed = tutorRequestSchema.safeParse(await c.req.json());
      if (!parsed.success) {
        return sseResponse([
          errorEvent('invalid_request', 'That question could not be read.', staticExcerpt),
        ]);
      }
      const body = parsed.data;

      const getChunks: ChunkSource = resolved.getChunks ?? loadLessonChunks;
      const chunks = await getChunks(body.lessonId, DEFAULT_HOTSPOTS);
      staticExcerpt = excerpt(chunks);

      const identity = await resolved.auth.getSession(c.req.raw);
      const sessionId = identity?.userId ?? body.sessionId ?? crypto.randomUUID();

      if (classifyIntent(body.question, LESSON_TERMS) === 'off_topic') {
        return sseResponse([
          errorEvent(
            'off_topic',
            'That question is outside this lesson. Ask about the structures in the heart instead.',
            staticExcerpt,
          ),
        ]);
      }

      const estimatedTokens = Math.ceil(body.question.length / 4) + 300;
      const quota = await checkQuota(
        resolved.kv,
        { authenticated: Boolean(identity), id: sessionId },
        (body.history?.length ?? 0) + 1,
        estimatedTokens,
      );
      if (!quota.allowed) {
        return sseResponse([
          errorEvent(quota.reason ?? 'quota', quota.message ?? 'Limit reached.', staticExcerpt),
        ]);
      }

      if (!resolved.llm) {
        return sseResponse([
          errorEvent(
            'tutor_unavailable',
            'The tutor is not configured. The lesson prose is available.',
            staticExcerpt,
          ),
        ]);
      }

      // Embedding failure degrades to lexical retrieval rather than blocking.
      const queryEmbedding = await resolved.llm
        .embed([body.question])
        .then((rows) => rows[0] ?? [])
        .catch(() => []);
      const retrieved = retrieveChunks(chunks, body.question, queryEmbedding);
      if (retrieved.length === 0) {
        return sseResponse([
          errorEvent('no_context', 'No lesson passage matches that question.', staticExcerpt),
        ]);
      }

      const prompt = assemblePrompt({
        activeHotspot: body.activeHotspot ?? null,
        chunks: retrieved,
        history: body.history ?? [],
        lessonTitle: body.lessonId,
        question: body.question,
      });

      // Validate before stream: an ungrounded answer is never emitted.
      const answer = await resolved.llm.complete(prompt);
      const validation = validateCitations(
        answer,
        new Set(retrieved.map((result) => result.chunk.id)),
      );
      if (!validation.valid) {
        return sseResponse([
          errorEvent(
            'invalid_citation',
            'The tutor could not ground that answer in the lesson. The prose below is reliable.',
            staticExcerpt,
          ),
        ]);
      }

      return sseResponse(
        [...deltaEvents(answer), { citations: validation.citations, type: 'done' as const }],
        true,
      );
    } catch {
      return sseResponse([
        errorEvent(
          'tutor_unavailable',
          'The tutor is temporarily unavailable. The lesson prose remains available.',
          staticExcerpt,
        ),
      ]);
    }
  });

  return app;
}
