import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../api/src/env';
import type { AuthPort } from '../../api/src/lib/auth';
import { InMemoryKv } from '../../api/src/lib/kv';
import type { LlmPort } from '../../api/src/lib/llm';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';

const { createDatabaseMock } = vi.hoisted(() => ({ createDatabaseMock: vi.fn() }));

vi.mock('../../api/src/db/client', () => ({ createDatabase: createDatabaseMock }));

import { createApp } from '../../api/src/index';

function unauthorizedAuth(): AuthPort {
  return {
    async getSession() {
      return null;
    },
    async handler() {
      return new Response('unauthorized', { status: 401 });
    },
  };
}

function unusedLlm(): LlmPort {
  return {
    async embed() {
      return [];
    },
    async complete() {
      return '';
    },
  };
}

function executionContext(pending: Promise<unknown>[]) {
  return {
    props: {},
    passThroughOnException() {},
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise);
    },
  };
}

describe('request-scoped production database', () => {
  const dbClients: object[] = [];
  const poolEnds: ReturnType<typeof vi.fn>[] = [];

  beforeEach(() => {
    dbClients.length = 0;
    poolEnds.length = 0;
    createDatabaseMock.mockReset();
    createDatabaseMock.mockImplementation(() => {
      const db = {};
      const end = vi.fn(async () => undefined);
      dbClients.push(db);
      poolEnds.push(end);
      return { db, pool: { end } };
    });
  });

  it('creates and closes a separate Neon pool for sequential requests sharing bindings', async () => {
    const env: Env = { DATABASE_URL: 'postgres://request-scope-test.invalid/db' };
    const app = createApp({ auth: unauthorizedAuth(), kv: new InMemoryKv(), llm: unusedLlm() });
    const firstPending: Promise<unknown>[] = [];
    const secondPending: Promise<unknown>[] = [];

    const first = await app.request(
      '/api/progress',
      undefined,
      env,
      executionContext(firstPending),
    );
    const second = await app.request(
      '/api/progress',
      undefined,
      env,
      executionContext(secondPending),
    );

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(createDatabaseMock).toHaveBeenCalledTimes(2);
    expect(dbClients).toHaveLength(2);
    expect(dbClients[0]).not.toBe(dbClients[1]);
    expect(poolEnds).toHaveLength(2);
    expect(poolEnds[0]).toHaveBeenCalledTimes(1);
    expect(poolEnds[1]).toHaveBeenCalledTimes(1);
    expect(firstPending).toEqual([poolEnds[0]?.mock.results[0]?.value]);
    expect(secondPending).toEqual([poolEnds[1]?.mock.results[0]?.value]);
    await Promise.all([...firstPending, ...secondPending]);
  });

  it('does not create or close a production pool when all dependencies are injected', async () => {
    const pending: Promise<unknown>[] = [];
    const app = createApp({
      auth: unauthorizedAuth(),
      chunkRepository: {
        async getChunks() {
          return [];
        },
      },
      db: new InMemoryProgressRepository(),
      kv: new InMemoryKv(),
      llm: unusedLlm(),
    });

    const response = await app.request(
      '/api/progress',
      undefined,
      { DATABASE_URL: 'postgres://request-scope-test.invalid/db' },
      executionContext(pending),
    );

    expect(response.status).toBe(401);
    expect(createDatabaseMock).not.toHaveBeenCalled();
    expect(pending).toEqual([]);
  });
});
