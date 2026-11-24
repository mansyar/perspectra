import { describe, expect, it } from 'vitest';
import {
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
