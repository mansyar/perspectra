import type { OfflineEvent, SyncBatch } from './offline-queue';

const baseUrl = import.meta.env.PUBLIC_API_URL ?? '';

export interface HotspotProgressView {
  hotspotId: string;
  eventId: string;
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface LessonProgressView {
  lessonId: string;
  hotspots: HotspotProgressView[];
  updatedAt: number;
}

export interface ProgressView {
  userId: string;
  lessons: LessonProgressView[];
  eventCount: number;
}

export interface SyncResult extends ProgressView {
  applied: number;
  duplicates: number;
}

export interface SessionInfo {
  authenticated: boolean;
  userId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** All calls are cookie-based; the client never handles a key or token. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new ApiError(
      `API request ${path} failed with status ${response.status}`,
      response.status,
    );
  }
  // The boundary is JSON; callers consume the typed view interfaces above.
  return (await response.json()) as T;
}

export function getProgress(): Promise<ProgressView> {
  return request<ProgressView>('/api/progress');
}

export function appendEvent(event: OfflineEvent): Promise<ProgressView> {
  return request<ProgressView>('/api/progress', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export function syncProgress(batch: SyncBatch): Promise<SyncResult> {
  return request<SyncResult>('/api/progress/sync', {
    method: 'POST',
    body: JSON.stringify(batch),
  });
}

/** Derives session state from the session-scoped progress endpoint. */
export async function sessionInfo(): Promise<SessionInfo> {
  try {
    const progress = await getProgress();
    return { authenticated: true, userId: progress.userId };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { authenticated: false };
    }
    throw error;
  }
}
