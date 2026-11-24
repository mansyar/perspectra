/**
 * Client-side offline progress queue. All functions here are browser-only;
 * no credentials or server bindings ever reach this module.
 */

export const offlineEventTypes = ['view', 'answer', 'quiz_result', 'reflection'] as const;

export type OfflineEventType = (typeof offlineEventTypes)[number];

export interface OfflineEvent {
  id: string;
  lessonId: string;
  hotspotId: string;
  type: OfflineEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface SyncBatch {
  events: OfflineEvent[];
}

function recency(left: OfflineEvent, right: OfflineEvent): number {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp - right.timestamp;
  }
  return left.id.localeCompare(right.id);
}

/**
 * Deduplicates by event ID, then keeps the newest event for each
 * lesson/hotspot pair. The result is ordered old-to-new for replay.
 */
export function mergeEvents(local: OfflineEvent[], remote: OfflineEvent[]): OfflineEvent[] {
  const byId = new Map<string, OfflineEvent>();
  const winners = new Map<string, OfflineEvent>();

  for (const event of [...remote, ...local]) {
    if (byId.has(event.id)) {
      continue;
    }
    byId.set(event.id, event);
    const key = `${event.lessonId}\u0000${event.hotspotId}`;
    const current = winners.get(key);
    if (!current || recency(event, current) > 0) {
      winners.set(key, event);
    }
  }

  return Array.from(winners.values()).toSorted(recency);
}

/** Wraps events in the wire format sent to the sync endpoint. */
export function toSyncBatch(events: OfflineEvent[]): SyncBatch {
  return { events: events.toSorted(recency) };
}

const DATABASE_NAME = 'perspectra-offline';
const STORE_NAME = 'events';
const DATABASE_VERSION = 1;

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** Appends an event to the durable local queue. */
export async function enqueue(event: OfflineEvent): Promise<void> {
  const db = await openQueue();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(event);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

/** Reads every queued event and empties the store in one transaction. */
export async function drain(): Promise<OfflineEvent[]> {
  const db = await openQueue();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    const events = new Promise<OfflineEvent[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as OfflineEvent[]);
      request.onerror = () => reject(request.error);
    });
    store.clear();
    const done = transactionDone(transaction);
    const queued = await events;
    await done;
    return queued;
  } finally {
    db.close();
  }
}

/** Removes all queued events without reading them. */
export async function clear(): Promise<void> {
  const db = await openQueue();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
