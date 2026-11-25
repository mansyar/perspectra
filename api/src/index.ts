import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDatabase } from './db/client';
import * as schema from './db/schema';
import type { Env } from './env';
import { badgeRoutes, type BadgeDeps, type LessonTitleSource } from './routes/badge';
import { masteryRoutes, quizRoutes, type QuizDeps } from './routes/quiz';
import { createAuth, type AuthPort } from './lib/auth';
import { learningEventSchema, syncBatchSchema, type LearningEvent } from './lib/events';
import { createWorkersKv, type KvPort } from './lib/kv';
import {
  createDrizzleLessonChunkRepository,
  type LessonChunkRepository,
} from './lib/lesson-chunk-repository';
import { createLlmAdapter, type LlmPort } from './lib/llm';
import { createNeonProgressRepository, type ProgressRepository } from './lib/progress-repository';
import { loadLessonChunks } from './lib/retrieval';
import { tutorRoutes, type ChunkSource } from './routes/tutor';

/** Everything the routes need; tests inject fakes for all external services. */
export interface AppDeps {
  db: ProgressRepository;
  auth: AuthPort;
  kv: KvPort;
  chunkRepository?: LessonChunkRepository;
  llm?: LlmPort;
  getChunks?: ChunkSource;
  getLessonTitle?: LessonTitleSource;
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
  const production = new WeakMap<Request, AppDeps>();
  const connections = new WeakMap<Request, ReturnType<typeof createDatabase>>();

  function databaseFor(env: Env, request: Request): ReturnType<typeof createDatabase> {
    let connection = connections.get(request);
    if (!connection) {
      connection = createDatabase(env);
      connections.set(request, connection);
    }
    return connection;
  }

  function resolve(env: Env, request: Request): AppDeps {
    // app.request() in tests may omit bindings; production always passes an object.
    const bindings = env ?? ({} as Env);
    const cached = production.get(request);
    if (cached) {
      return cached;
    }
    const db = dependencies?.db ?? createNeonProgressRepository(databaseFor(bindings, request).db);
    const auth = dependencies?.auth ?? createAuth(bindings, databaseFor(bindings, request).db);
    const kv = dependencies?.kv ?? createWorkersKv(bindings.RATE_LIMIT_KV);
    // The repository is already scoped by lessonId; never apply a heart-only
    // allowlist to its results or a second lesson's chunks would all vanish.
    const chunkRepository =
      dependencies?.chunkRepository ??
      (bindings.DATABASE_URL
        ? createDrizzleLessonChunkRepository(databaseFor(bindings, request).db)
        : null);
    const productionChunks: ChunkSource = (lessonId, hotspots) =>
      chunkRepository ? chunkRepository.getChunks(lessonId) : loadLessonChunks(lessonId, hotspots);
    const getLessonTitle: LessonTitleSource =
      dependencies?.getLessonTitle ??
      (async (lessonId) => {
        if (!bindings.DATABASE_URL) {
          return null;
        }
        const [row] = await databaseFor(bindings, request)
          .db.select({ title: schema.lesson.title })
          .from(schema.lesson)
          .where(eq(schema.lesson.id, lessonId))
          .limit(1);
        return row?.title ?? null;
      });
    const resolved: AppDeps = {
      auth,
      db,
      getChunks: dependencies?.getChunks ?? productionChunks,
      getLessonTitle,
      kv,
      llm: dependencies?.llm ?? createLlmAdapter(bindings),
    };
    production.set(request, resolved);
    return resolved;
  }

  function quizFor(env: Env, request: Request): QuizDeps {
    const deps = resolve(env, request);
    return {
      auth: deps.auth,
      db: deps.db,
      getChunks: deps.getChunks,
      kv: deps.kv,
      llm: deps.llm ?? createLlmAdapter(env),
      secret: env.BETTER_AUTH_SECRET ?? '',
    };
  }

  function badgeFor(env: Env, request: Request): BadgeDeps {
    const deps = resolve(env, request);
    return {
      auth: deps.auth,
      db: deps.db,
      getChunks: deps.getChunks,
      getLessonTitle: deps.getLessonTitle,
      secret: env.BETTER_AUTH_SECRET ?? '',
    };
  }

  app.use('*', async (c, next) => {
    try {
      await next();
    } finally {
      const connection = connections.get(c.req.raw);
      if (connection) {
        c.executionCtx?.waitUntil(connection.pool.end());
      }
    }
  });

  app.get('/health', (c) => c.json({ status: 'ok', service: 'perspectra-api' }));

  app.route('/api/quiz', quizRoutes(quizFor));
  app.route('/api/mastery', masteryRoutes(quizFor));
  app.route('/api/badge', badgeRoutes(badgeFor));

  app.route(
    '/api/tutor',
    tutorRoutes((env, request) => {
      const deps = resolve(env, request);
      return { auth: deps.auth, getChunks: deps.getChunks, kv: deps.kv, llm: deps.llm };
    }),
  );

  app.all('/api/auth/*', (c) => resolve(c.env, c.req.raw).auth.handler(c.req.raw));

  app.get('/api/progress', async (c) => {
    const deps = resolve(c.env, c.req.raw);
    const identity = await deps.auth.getSession(c.req.raw);
    if (!identity) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return c.json(await deps.db.getProgress(identity.userId));
  });

  app.post('/api/progress', async (c) => {
    const deps = resolve(c.env, c.req.raw);
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
    const deps = resolve(c.env, c.req.raw);
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

  app.all('*', async (c) => {
    const path = c.req.path;
    // API-first routing must never turn an unknown endpoint into static HTML.
    if (path === '/health' || path === '/api' || path.startsWith('/api/')) {
      return c.notFound();
    }

    const assets = c.env.ASSETS;
    if (!assets) {
      return c.notFound();
    }
    const response = await assets.fetch(c.req.raw);
    return response.status === 404 ? c.notFound() : response;
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
export default app;
