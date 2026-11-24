import { describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from '../../api/src/index';
import { authProviders, type AuthPort } from '../../api/src/lib/auth';
import type { LearningEvent } from '../../api/src/lib/events';
import { InMemoryKv } from '../../api/src/lib/kv';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';

type App = ReturnType<typeof createApp>;

function fakeAuth(tokens: Record<string, string>): AuthPort {
  return {
    async getSession(request: Request) {
      const header = request.headers.get('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
      const userId = token ? tokens[token] : undefined;
      return userId ? { userId } : null;
    },
    async handler() {
      return new Response('auth-handler');
    },
  };
}

function setup(): { app: App; deps: AppDeps } {
  const deps: AppDeps = {
    db: new InMemoryProgressRepository(),
    auth: fakeAuth({ 'token-a': 'user-a', 'token-b': 'user-b' }),
    kv: new InMemoryKv(),
  };
  return { app: createApp(deps), deps };
}

interface CallOptions {
  body?: unknown;
  token?: string;
}

function call(
  app: App,
  method: string,
  path: string,
  options: CallOptions = {},
): Promise<Response> {
  const headers = new Headers();
  if (options.token) {
    headers.set('authorization', `Bearer ${options.token}`);
  }
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  return Promise.resolve(
    app.fetch(
      new Request(`http://localhost${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      }),
      {},
    ),
  );
}

function event(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    id: 'event-1',
    lessonId: 'heart',
    hotspotId: 'aorta',
    type: 'view',
    payload: { layer: 'overview' },
    timestamp: 1700000000000,
    ...overrides,
  };
}

describe('progress API', () => {
  it('serves a stable health payload', async () => {
    const { app } = setup();
    const response = await call(app, 'GET', '/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', service: 'perspectra-api' });
  });

  it('rejects unauthenticated progress reads with 401', async () => {
    const { app } = setup();
    const response = await call(app, 'GET', '/api/progress');
    expect(response.status).toBe(401);
  });

  it('returns empty session-scoped progress for a new learner', async () => {
    const { app } = setup();
    const response = await call(app, 'GET', '/api/progress', { token: 'token-a' });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      userId: 'user-a',
      lessons: [],
      eventCount: 0,
    });
  });

  it('appends one validated event and exposes it on the next read', async () => {
    const { app } = setup();
    const created = await call(app, 'POST', '/api/progress', {
      token: 'token-a',
      body: event(),
    });
    expect(created.status).toBe(201);

    const read = await call(app, 'GET', '/api/progress', { token: 'token-a' });
    const state = await read.json();
    expect(state.eventCount).toBe(1);
    expect(state.lessons[0].hotspots[0]).toMatchObject({
      hotspotId: 'aorta',
      eventId: 'event-1',
    });
  });

  it('rejects malformed events before touching storage', async () => {
    const { app, deps } = setup();
    const response = await call(app, 'POST', '/api/progress', {
      token: 'token-a',
      body: { id: 'bad' },
    });
    expect(response.status).toBe(400);
    expect(await deps.db.getEvents('user-a')).toEqual([]);
  });

  it('syncs an offline batch once, even when replayed', async () => {
    const { app } = setup();
    const batch = { events: [event(), event()] };
    const first = await call(app, 'POST', '/api/progress/sync', {
      token: 'token-a',
      body: batch,
    });
    await expect(first.json()).resolves.toMatchObject({ applied: 1, duplicates: 1 });

    const replay = await call(app, 'POST', '/api/progress/sync', {
      token: 'token-a',
      body: batch,
    });
    await expect(replay.json()).resolves.toMatchObject({ applied: 0, duplicates: 2 });

    const read = await call(app, 'GET', '/api/progress', { token: 'token-a' });
    expect((await read.json()).eventCount).toBe(1);
  });

  it('applies last-write-wins per hotspot during sync', async () => {
    const { app } = setup();
    await call(app, 'POST', '/api/progress/sync', {
      token: 'token-a',
      body: {
        events: [
          event({ id: 'old', timestamp: 1000, payload: { version: 1 } }),
          event({ id: 'new', timestamp: 2000, payload: { version: 2 } }),
        ],
      },
    });
    const read = await call(app, 'GET', '/api/progress', { token: 'token-a' });
    const state = await read.json();
    expect(state.lessons[0].hotspots).toHaveLength(1);
    expect(state.lessons[0].hotspots[0]).toMatchObject({
      eventId: 'new',
      payload: { version: 2 },
    });
  });

  it("never leaks one session's progress to another", async () => {
    const { app } = setup();
    await call(app, 'POST', '/api/progress', { token: 'token-a', body: event() });

    const other = await call(app, 'GET', '/api/progress', { token: 'token-b' });
    await expect(other.json()).resolves.toMatchObject({ userId: 'user-b', eventCount: 0 });
  });

  it('rate limits progress writes per user', async () => {
    const { app } = setup();
    for (let index = 0; index < 120; index += 1) {
      const response = await call(app, 'POST', '/api/progress', {
        token: 'token-a',
        body: event({ id: `event-${index}` }),
      });
      expect(response.status).toBe(201);
    }
    const limited = await call(app, 'POST', '/api/progress', {
      token: 'token-a',
      body: event({ id: 'event-121' }),
    });
    expect(limited.status).toBe(429);
  });

  it('delegates auth paths to the injected handler', async () => {
    const { app } = setup();
    const response = await call(app, 'POST', '/api/auth/sign-in/email');
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('auth-handler');
  });
});

describe('auth configuration', () => {
  it('exposes GitHub, Google and email/password as configured providers', () => {
    expect(authProviders.emailAndPassword).toBe(true);
    expect(authProviders.socialProviders).toContain('github');
    expect(authProviders.socialProviders).toContain('google');
    expect(authProviders.socialProviders).toHaveLength(2);
  });
});

const clientSources = import.meta.glob('../../src/**/*.{ts,astro}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const apiSources = import.meta.glob('../../api/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const wrangler = import.meta.glob('../../wrangler.toml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const credentialPatterns: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bgh[pousr]_[A-Za-z0-9]{16,}/,
  /github_pat_[A-Za-z0-9_]{16,}/,
  /\bAIza[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s'"`]+/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/,
];

describe('client secret audit', () => {
  it('ships no credential literals in client or API source', () => {
    const sources = [...Object.values(clientSources), ...Object.values(apiSources)];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      for (const pattern of credentialPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    }
  });

  it('declares only non-secret bindings in wrangler.toml', () => {
    const config = Object.values(wrangler)[0];
    expect(config).toContain('RATE_LIMIT_KV');
    expect(config).not.toMatch(/DATABASE_URL|CLIENT_SECRET|BETTER_AUTH_SECRET|LLM_API_KEY|API_KEY/);
  });
});
