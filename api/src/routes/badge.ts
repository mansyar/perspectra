import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import type { AuthPort } from '../lib/auth';
import { createBadgeService } from '../lib/badge';
import { computeMastery, MASTERY_THRESHOLD } from '../lib/mastery';
import type { ProgressRepository } from '../lib/progress-repository';
import { DEFAULT_HOTSPOTS } from '../lib/retrieval';

export interface BadgeDeps {
  db: ProgressRepository;
  auth: AuthPort;
  secret: string;
}

export type BadgeDepsResolver = (env: Env) => BadgeDeps;

const verifySchema = z.object({ credential: z.string().min(1) });

async function issueHandler(
  c: Context<{ Bindings: Env }>,
  deps: BadgeDeps | BadgeDepsResolver,
): Promise<Response> {
  const resolved = typeof deps === 'function' ? deps(c.env) : deps;
  if (!resolved.secret) {
    return c.json({ error: 'not_configured' }, 503);
  }
  const identity = await resolved.auth.getSession(c.req.raw);
  if (!identity) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const mastery = computeMastery(await resolved.db.getEvents(identity.userId), DEFAULT_HOTSPOTS);
  const failing = mastery.hotspots
    .filter((hotspot) => hotspot.mastery < MASTERY_THRESHOLD)
    .map((hotspot) => hotspot.hotspotId);
  if (failing.length > 0) {
    return c.json({ error: 'not_mastered', failing }, 403);
  }
  const envelope = await createBadgeService(resolved.secret).issue({
    lessonId: 'heart',
    mastery: mastery.overall,
    userId: identity.userId,
  });
  return c.json(envelope);
}

async function verifyHandler(
  c: Context<{ Bindings: Env }>,
  deps: BadgeDeps | BadgeDepsResolver,
): Promise<Response> {
  const resolved = typeof deps === 'function' ? deps(c.env) : deps;
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
