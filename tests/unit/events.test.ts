import { describe, expect, it } from 'vitest';
import {
  buildProgressState,
  compareByRecency,
  learningEventSchema,
  syncBatchSchema,
  type LearningEvent,
} from '../../api/src/lib/events';

function makeEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return learningEventSchema.parse({
    hotspotId: 'aorta',
    id: 'e1',
    lessonId: 'heart',
    payload: {},
    timestamp: 1000,
    type: 'view',
    ...overrides,
  });
}

describe('learning event schemas', () => {
  it('defaults payload and rejects invalid types or timestamps', () => {
    expect(makeEvent().payload).toEqual({});
    expect(() => learningEventSchema.parse({ ...makeEvent(), type: 'unknown' })).toThrow();
    expect(() => learningEventSchema.parse({ ...makeEvent(), timestamp: -1 })).toThrow();
    expect(() => syncBatchSchema.parse({ events: [] })).not.toThrow();
    expect(() =>
      syncBatchSchema.parse({ events: Array.from({ length: 1001 }, () => makeEvent()) }),
    ).toThrow();
  });
});

describe('compareByRecency', () => {
  it('orders by timestamp then ID', () => {
    expect(compareByRecency(makeEvent({ timestamp: 1 }), makeEvent({ timestamp: 2 }))).toBeLessThan(
      0,
    );
    expect(compareByRecency(makeEvent({ id: 'a' }), makeEvent({ id: 'b' }))).toBeLessThan(0);
    expect(compareByRecency(makeEvent({ id: 'a' }), makeEvent({ id: 'a' }))).toBe(0);
  });
});

describe('buildProgressState', () => {
  it('sorts lessons and hotspots and keeps the newest event per hotspot', () => {
    const state = buildProgressState('user-1', [
      makeEvent({ hotspotId: 'aorta', id: 'old', timestamp: 1000 }),
      makeEvent({ hotspotId: 'aorta', id: 'new', timestamp: 2000, type: 'answer' }),
      makeEvent({ hotspotId: 'left_ventricle', id: 'lv', timestamp: 1500 }),
      makeEvent({ hotspotId: 'aorta', id: 'other', lessonId: 'brain', timestamp: 500 }),
    ]);
    expect(state.userId).toBe('user-1');
    expect(state.eventCount).toBe(4);
    expect(state.lessons.map((lesson) => lesson.lessonId)).toEqual(['brain', 'heart']);
    expect(state.lessons[1].hotspots.map((hotspot) => hotspot.hotspotId)).toEqual([
      'aorta',
      'left_ventricle',
    ]);
    expect(state.lessons[1].hotspots[0].eventId).toBe('new');
    expect(state.lessons[1].updatedAt).toBe(2000);
  });
});
