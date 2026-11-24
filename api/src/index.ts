import { Hono } from 'hono';
import { createDatabase } from './db/client';
import type { Env } from './env';
import { badgeRoutes, type BadgeDeps } from './routes/badge';
import { masteryRoutes, quizRoutes, type QuizDeps } from './routes/quiz';
import { createAuth, type AuthPort } from './lib/auth';
import { learningEventSchema, syncBatchSchema, type LearningEvent } from './lib/events';
import { createWorkersKv, type KvPort } from './lib/kv';
import { createLlmAdapter, type LlmPort } from './lib/llm';
import { createNeonProgressRepository, type ProgressRepository } from './lib/progress-repository';
import { loadLessonChunks } from './lib/retrieval';
import { tutorRoutes, type ChunkSource } from './routes/tutor';

/** Everything the routes need; tests inject fakes for all external services. */
export interface AppDeps {
  db: ProgressRepository;
  auth: AuthPort;
  kv: KvPort;
  llm?: LlmPort;
  getChunks?: ChunkSource;
}

type AppEnv = { Bindings: Env };

const RATE_LIMIT_WRITES = 120;
const RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Builds the API. With no arguments the production dependencies are resolved
 * lazily from Worker bindings; passing all three injects test doubles.
 */
export function createApp(dependencies?: Partial<AppDeps>): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const production = new WeakMap<Env, AppDeps>();
  const connections = new WeakMap<Env, ReturnType<typeof createDatabase>>();

  function databaseFor(env: Env): ReturnType<typeof createDatabase> {
    let connection = connections.get(env);
    if (!connection) {
      connection = createDatabase(env);
      connections.set(env, connection);
    }
    return connection;
  }

  function resolve(env: Env): AppDeps {
    if (dependencies?.db && dependencies.auth && dependencies.kv) {
      return {
        auth: dependencies.auth,
        db: dependencies.db,
        getChunks: dependencies.getChunks,
        kv: dependencies.kv,
        llm: dependencies.llm,
      };
    }
    const cached = production.get(env);
    if (cached) {
      return cached;
    }
    const db = dependencies?.db ?? createNeonProgressRepository(databaseFor(env));
    const auth = dependencies?.auth ?? createAuth(env, databaseFor(env));
    const kv = dependencies?.kv ?? createWorkersKv(env.RATE_LIMIT_KV);
    const resolved = {
      auth,
      db,
      getChunks: dependencies?.getChunks ?? loadLessonChunks,
      kv,
      llm: dependencies?.llm ?? createLlmAdapter(env),
    };
    production.set(env, resolved);
    return resolved;
  }

  function quizFor(env: Env): QuizDeps {
    const deps = resolve(env);
    return {
      auth: deps.auth,
      db: deps.db,
      kv: deps.kv,
      llm: deps.llm ?? createLlmAdapter(env),
      secret: env.BETTER_AUTH_SECRET ?? '',
    };
  }

  function badgeFor(env: Env): BadgeDeps {
    const deps = resolve(env);
    return { auth: deps.auth, db: deps.db, secret: env.BETTER_AUTH_SECRET ?? '' };
  }

  app.get('/health', (c) => c.json({ status: 'ok', service: 'perspectra-api' }));

  app.route('/api/quiz', quizRoutes(quizFor));
  app.route('/api/mastery', masteryRoutes(quizFor));
  app.route('/api/badge', badgeRoutes(badgeFor));

  app.route(
    '/api/tutor',
    tutorRoutes((env) => {
      const deps = resolve(env);
      return { auth: deps.auth, getChunks: deps.getChunks, kv: deps.kv, llm: deps.llm };
    }),
  );

  app.all('/api/auth/*', (c) => resolve(c.env).auth.handler(c.req.raw));

  app.get('/api/progress', async (c) => {
    const deps = resolve(c.env);
    const identity = await deps.auth.getSession(c.req.raw);
    if (!identity) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return c.json(await deps.db.getProgress(identity.userId));
  });

  app.post('/api/progress', async (c) => {
    const deps = resolve(c.env);
    const identity = await deps.auth.getSession(c.req.raw);
    if (!identity) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    const parsed = learningEventSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_event' }, 400);
    }

    const allowed = await allowWrite(deps.kv, identity.userId);
    if (!allowed) {
      return c.json({ error: 'rate_limited' }, 429);
    }

    const state = await deps.db.appendEvents(identity.userId, [parsed.data]);
    return c.json(state, 201);
  });

  app.post('/api/progress/sync', async (c) => {
    const deps = resolve(c.env);
    const identity = await deps.auth.getSession(c.req.raw);
    if (!identity) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    const parsed = syncBatchSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_batch' }, 400);
    }

    const allowed = await allowWrite(deps.kv, identity.userId);
    if (!allowed) {
      return c.json({ error: 'rate_limited' }, 429);
    }

    const existing = await deps.db.getEvents(identity.userId);
    const seen = new Set(existing.map((event) => event.id));
    const unique: LearningEvent[] = [];
    let duplicates = 0;
    for (const event of parsed.data.events) {
      if (seen.has(event.id)) {
        duplicates += 1;
        continue;
      }
      seen.add(event.id);
      unique.push(event);
    }

    const state = await deps.db.appendEvents(identity.userId, unique);
    return c.json({ ...state, applied: unique.length, duplicates });
  });

  return app;
}

async function allowWrite(kv: KvPort, userId: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 60_000);
  const key = `progress-write:${bucket}:${userId}`;
  const raw = await kv.get(key);
  const count = typeof raw === 'number' ? raw : Number(raw ?? 0);
  if (count >= RATE_LIMIT_WRITES) {
    return false;
  }
  await kv.put(key, count + 1, RATE_LIMIT_WINDOW_SECONDS);
  return true;
}

/** Worker entry point. Bindings are supplied per request, so deps stay lazy. */
export const app = createApp();
