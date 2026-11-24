import { describe, expect, it, vi } from 'vitest';
import worker, { app, createApp } from '../../api/src/index';
import type { Env } from '../../api/src/env';
import type { AuthPort } from '../../api/src/lib/auth';
import { InMemoryKv } from '../../api/src/lib/kv';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';

function fakeAuth(): AuthPort {
  return {
    async getSession() {
      return null;
    },
    async handler() {
      return new Response('auth-handler');
    },
  };
}

function setup() {
  return createApp({
    auth: fakeAuth(),
    db: new InMemoryProgressRepository(),
    kv: new InMemoryKv(),
  });
}

describe('Worker module entry point', () => {
  it('exports the same Hono app as the named and default entry points', () => {
    expect(worker).toBe(app);
    expect(typeof worker.fetch).toBe('function');
  });
});

describe('Worker static asset fallback', () => {
  it('serves an injected asset response with the original request', async () => {
    const assetResponse = new Response('<html>lesson</html>', {
      headers: { 'content-type': 'text/html' },
      status: 200,
    });
    const fetchAssets = vi.fn(async (_request: Request) => assetResponse);
    const request = new Request('https://public.example/lessons/heart/');

    const response = await setup().fetch(request, { ASSETS: { fetch: fetchAssets } });

    expect(fetchAssets).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    await expect(response.text()).resolves.toBe('<html>lesson</html>');
  });

  it('keeps health and API routes ahead of the asset handler', async () => {
    const fetchAssets = vi.fn(async () => new Response('asset'));
    const env: Env = { ASSETS: { fetch: fetchAssets } };
    const app = setup();

    const health = await app.fetch(new Request('https://public.example/health'), env);
    const api = await app.fetch(new Request('https://public.example/api/progress'), env);

    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ status: 'ok', service: 'perspectra-api' });
    expect(api.status).toBe(401);
    expect(fetchAssets).not.toHaveBeenCalled();
  });

  it('returns a real 404 when the asset binding is missing', async () => {
    const response = await setup().fetch(
      new Request('https://public.example/lessons/missing/'),
      {},
    );

    expect(response.status).toBe(404);
  });

  it('preserves an asset 404 instead of returning an SPA index', async () => {
    const fetchAssets = vi.fn(async () => new Response('not found', { status: 404 }));

    const response = await setup().fetch(new Request('https://public.example/missing'), {
      ASSETS: { fetch: fetchAssets },
    });

    expect(fetchAssets).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.not.toContain('<html');
  });

  it('never turns an unknown API route into a static page', async () => {
    const fetchAssets = vi.fn(async () => new Response('<html>index</html>'));

    const response = await setup().fetch(new Request('https://public.example/api/not-a-route'), {
      ASSETS: { fetch: fetchAssets },
    });

    expect(response.status).toBe(404);
    expect(fetchAssets).not.toHaveBeenCalled();
  });
});
