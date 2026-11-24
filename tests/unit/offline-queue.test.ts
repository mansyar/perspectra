import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clear,
  drain,
  enqueue,
  mergeEvents,
  toSyncBatch,
  type OfflineEvent,
  type OfflineEventType,
} from '../../src/lib/offline-queue';

function event(overrides: Partial<OfflineEvent> = {}): OfflineEvent {
  const type: OfflineEventType = overrides.type ?? 'view';
  return {
    id: 'e1',
    lessonId: 'heart',
    hotspotId: 'aorta',
    type,
    payload: {},
    timestamp: 1000,
    ...overrides,
  };
}

describe('mergeEvents', () => {
  it('deduplicates events by ID', () => {
    const merged = mergeEvents([event()], [event()]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('e1');
  });

  it('keeps the newer timestamp for the same lesson and hotspot', () => {
    const merged = mergeEvents(
      [event({ id: 'old', timestamp: 1000 })],
      [event({ id: 'new', timestamp: 2000 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('new');
    expect(merged[0].timestamp).toBe(2000);
  });

  it('breaks timestamp ties deterministically by ID', () => {
    const merged = mergeEvents(
      [event({ id: 'b', timestamp: 1000 })],
      [event({ id: 'a', timestamp: 1000 })],
    );
    // Ascending ID order makes the later ID the winner on equal timestamps.
    expect(merged[0].id).toBe('b');
  });

  it('keeps one latest event per distinct hotspot', () => {
    const merged = mergeEvents(
      [event({ id: 'aorta-1', hotspotId: 'aorta', timestamp: 1000 })],
      [
        event({ id: 'aorta-2', hotspotId: 'aorta', timestamp: 1500 }),
        event({ id: 'mitral-1', hotspotId: 'mitral_valve', timestamp: 900 }),
      ],
    );
    expect(merged.map((item) => item.id)).toEqual(['mitral-1', 'aorta-2']);
  });

  it('returns an empty list when both inputs are empty', () => {
    expect(mergeEvents([], [])).toEqual([]);
  });
});

describe('toSyncBatch', () => {
  it('wraps events in ascending timestamp order', () => {
    const batch = toSyncBatch([
      event({ id: 'late', timestamp: 2000 }),
      event({ id: 'early', timestamp: 1000 }),
    ]);
    expect(batch.events.map((item) => item.id)).toEqual(['early', 'late']);
  });

  it('returns an empty batch for no events', () => {
    expect(toSyncBatch([])).toEqual({ events: [] });
  });
});

/** Minimal IndexedDB stand-in: enough to exercise the queue without a browser. */
class FakeRequest<T> {
  error: unknown = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
  result!: T;
}

class FakeStore {
  items = new Map<string, OfflineEvent>();

  put(value: OfflineEvent): FakeRequest<void> {
    const request = new FakeRequest<void>();
    queueMicrotask(() => {
      this.items.set(value.id, value);
      request.result = undefined;
      request.onsuccess?.();
    });
    return request;
  }

  getAll(): FakeRequest<OfflineEvent[]> {
    const request = new FakeRequest<OfflineEvent[]>();
    queueMicrotask(() => {
      request.result = [...this.items.values()];
      request.onsuccess?.();
    });
    return request;
  }

  clear(): FakeRequest<void> {
    const request = new FakeRequest<void>();
    queueMicrotask(() => {
      this.items.clear();
      request.result = undefined;
      request.onsuccess?.();
    });
    return request;
  }
}

class FakeTransaction {
  error: unknown = null;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor(
    private store: FakeStore,
    private fail = false,
  ) {
    queueMicrotask(() => {
      if (this.fail) {
        this.error = new Error('transaction failed');
        this.onerror?.();
      } else {
        this.oncomplete?.();
      }
    });
  }

  objectStore(): FakeStore {
    return this.store;
  }
}

class FakeDb {
  store!: FakeStore;
  objectStoreNames = { contains: (name: string) => this.store !== undefined && name === 'events' };

  constructor(private fail = false) {}

  createObjectStore(): FakeStore {
    this.store = new FakeStore();
    return this.store;
  }

  transaction(): FakeTransaction {
    return new FakeTransaction(this.store, this.fail);
  }

  close(): void {}
}

function installFakeIndexedDb(fail = false): void {
  const database = new FakeDb(fail);
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request = new FakeRequest<IDBDatabase>();
      queueMicrotask(() => {
        request.result = database as unknown as IDBDatabase;
        if (!database.objectStoreNames.contains('events')) {
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      });
      return request;
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IndexedDB queue', () => {
  it('enqueues, drains and clears events durably', async () => {
    installFakeIndexedDb();
    await enqueue(event({ id: 'one' }));
    await enqueue(event({ id: 'two', timestamp: 2000 }));
    expect(await drain()).toHaveLength(2);
    expect(await drain()).toEqual([]);
    await enqueue(event({ id: 'three' }));
    await clear();
    expect(await drain()).toEqual([]);
  });

  it('rejects when the database cannot be opened', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        const request = new FakeRequest<IDBDatabase>();
        request.error = new Error('open failed');
        queueMicrotask(() => request.onerror?.());
        return request;
      },
    });
    await expect(enqueue(event())).rejects.toThrow('open failed');
  });

  it('rejects when a transaction fails', async () => {
    installFakeIndexedDb(true);
    await expect(enqueue(event())).rejects.toBeTruthy();
  });
});
