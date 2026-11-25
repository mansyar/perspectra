import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import type { AuthPort } from '../lib/auth';
import { createBadgeService } from '../lib/badge';
import { computeMastery, MASTERY_THRESHOLD } from '../lib/mastery';
import type { ProgressRepository } from '../lib/progress-repository';
import { hotspotIdsFromChunks } from '../lib/retrieval';
import type { ChunkSource } from './tutor';

export type LessonTitleSource = (lessonId: string) => string | null | Promise<string | null>;

export interface BadgeDeps {
  db: ProgressRepository;
  auth: AuthPort;
  getChunks?: ChunkSource;
  getLessonTitle?: LessonTitleSource;
  secret: string;
}

export type BadgeDepsResolver = (env: Env, request: Request) => BadgeDeps;

const verifySchema = z.object({ credential: z.string().min(1) });
const issueSchema = z.object({ lessonId: z.string().min(1) });

/** Badge vocabulary always comes from the requested lesson's grounded chunks. */
async function badgeHotspots(deps: BadgeDeps, lessonId: string): Promise<string[]> {
  if (!deps.getChunks) {
    return [];
  }
  try {
    return hotspotIdsFromChunks(await deps.getChunks(lessonId));
  } catch {
    return [];
  }
}

async function issueHandler(
  c: Context<{ Bindings: Env }>,
  deps: BadgeDeps | BadgeDepsResolver,
): Promise<Response> {
  const resolved = typeof deps === 'function' ? deps(c.env, c.req.raw) : deps;
  if (!resolved.secret) {
    return c.json({ error: 'not_configured' }, 503);
  }
  const identity = await resolved.auth.getSession(c.req.raw);
  if (!identity) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  let body: unknown = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = issueSchema.safeParse(body);
  const lessonId = parsed.success ? parsed.data.lessonId : 'heart';
  const hotspots = await badgeHotspots(resolved, lessonId);
  if (hotspots.length === 0) {
    return c.json({ error: 'lesson_unavailable' }, 503);
  }
  let lessonTitle: string | undefined;
  if (resolved.getLessonTitle) {
    try {
      lessonTitle = (await resolved.getLessonTitle(lessonId)) ?? undefined;
    } catch {
      lessonTitle = undefined;
    }
  }
  const mastery = computeMastery(await resolved.db.getEvents(identity.userId), hotspots);
  const failing = mastery.hotspots
    .filter((hotspot) => hotspot.mastery < MASTERY_THRESHOLD)
    .map((hotspot) => hotspot.hotspotId);
  if (failing.length > 0) {
    return c.json({ error: 'not_mastered', failing }, 403);
  }
  const envelope = await createBadgeService(resolved.secret).issue({
    hotspots,
    lessonId,
    lessonTitle,
    mastery: mastery.overall,
    userId: identity.userId,
  });
  return c.json(envelope);
}

async function verifyHandler(
  c: Context<{ Bindings: Env }>,
  deps: BadgeDeps | BadgeDepsResolver,
): Promise<Response> {
  const resolved = typeof deps === 'function' ? deps(c.env, c.req.raw) : deps;
  if (!resolved.secret) {
    return c.json({ error: 'not_configured' }, 503);
  }
  const parsed = verifySchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'invalid_request' }, 400);
  }
  return c.json(await createBadgeService(resolved.secret).verify(parsed.data.credential));
}

/** Badge issuance is session-scoped; verification is deliberately public. */
export function badgeRoutes(deps: BadgeDeps | BadgeDepsResolver): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();
  app.post('/issue', (c) => issueHandler(c, deps));
  app.post('/verify', (c) => verifyHandler(c, deps));
  return app;
}
