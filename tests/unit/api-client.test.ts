import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  appendEvent,
  getProgress,
  sessionInfo,
  syncProgress,
} from '../../src/lib/api-client';
import type { OfflineEvent, SyncBatch } from '../../src/lib/offline-queue';

const progress = {
  userId: 'learner-a',
  lessons: [],
  eventCount: 0,
};

function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const sample: OfflineEvent = {
  id: 'event-1',
  lessonId: 'heart',
  hotspotId: 'aorta',
  type: 'view',
  payload: { layer: 'overview' },
  timestamp: 1700000000000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api-client', () => {
  it('reads progress from the session-scoped GET endpoint', async () => {
    const fetchMock = mockFetch(progress);
    await expect(getProgress()).resolves.toEqual(progress);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/progress',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('falls back to a relative base URL when PUBLIC_API_URL is unset', async () => {
    const fetchMock = mockFetch(progress);
    await getProgress();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url.startsWith('/api/')).toBe(true);
  });

  it('appends one event with a JSON POST body', async () => {
    const fetchMock = mockFetch(progress, 201);
    await expect(appendEvent(sample)).resolves.toEqual(progress);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/progress',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(sample),
      }),
    );
  });

  it('posts a sync batch to the sync endpoint', async () => {
    const fetchMock = mockFetch({ ...progress, applied: 1, duplicates: 0 });
    const batch: SyncBatch = { events: [sample] };
    await expect(syncProgress(batch)).resolves.toEqual({ ...progress, applied: 1, duplicates: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/progress/sync',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(batch) }),
    );
  });

  it('sends a JSON content type on every request', async () => {
    const fetchMock = mockFetch(progress);
    await getProgress();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('propagates non-OK responses as ApiError with the status', async () => {
    mockFetch({ error: 'rate_limited' }, 429);
    await expect(getProgress()).rejects.toMatchObject({ name: 'ApiError', status: 429 });
  });

  it('derives an authenticated session from a successful progress read', async () => {
    mockFetch(progress);
    await expect(sessionInfo()).resolves.toEqual({ authenticated: true, userId: 'learner-a' });
  });

  it('reports an unauthenticated session on 401', async () => {
    mockFetch({ error: 'unauthorized' }, 401);
    await expect(sessionInfo()).resolves.toEqual({ authenticated: false });
  });

  it('rethrows unexpected errors from sessionInfo', async () => {
    mockFetch({ error: 'server_error' }, 500);
    await expect(sessionInfo()).rejects.toBeInstanceOf(ApiError);
  });
});
