import { describe, expect, it } from 'vitest';
import type { LearningEvent } from '../../api/src/lib/events';
import {
  bktUpdate,
  computeMastery,
  recommendNext,
  type MasteryView,
} from '../../api/src/lib/mastery';
import { DEFAULT_HOTSPOTS } from '../../api/src/lib/retrieval';
import { EARTH_LESSON } from '../fixtures/lessons';

const NOW = 1_700_000_000_000;

function event(overrides: Partial<LearningEvent> & { id: string }): LearningEvent {
  return {
    hotspotId: 'aorta',
    lessonId: 'heart',
    payload: {},
    timestamp: NOW,
    type: 'quiz_result',
    ...overrides,
  };
}

function view(masteries: readonly number[]): MasteryView {
  return {
    hotspots: masteries.map((mastery, index) => ({
      hotspotId: DEFAULT_HOTSPOTS[index] ?? `unknown_${index}`,
      mastery,
      attempts: 0,
      correct: 0,
      dueAt: null,
    })),
    overall: 0.5,
    updatedAt: null,
  };
}

describe('bktUpdate', () => {
  it('increases monotonically on repeated success', () => {
    let mastery = bktUpdate(0.2, true);
    for (let step = 0; step < 4; step += 1) {
      const next = bktUpdate(mastery, true);
      expect(next).toBeGreaterThan(mastery);
      mastery = next;
    }
    expect(mastery).toBeLessThanOrEqual(1);
  });

  it('decreases on repeated failure and stays clamped', () => {
    let mastery = bktUpdate(0.8, false);
    expect(mastery).toBeLessThan(0.8);
    for (let step = 0; step < 8; step += 1) {
      mastery = bktUpdate(mastery, false);
    }
    expect(mastery).toBeGreaterThanOrEqual(0);
  });

  it('accepts explicit BKT parameters', () => {
    expect(bktUpdate(0.2, true, { guess: 0, learn: 0, slip: 0 })).toBeCloseTo(1);
  });
});

describe('computeMastery', () => {
  it('keeps untouched hotspots at the 0.2 prior with no due card', () => {
    const mastery = computeMastery([], DEFAULT_HOTSPOTS);
    expect(mastery.updatedAt).toBeNull();
    expect(mastery.hotspots).toHaveLength(6);
    expect(mastery.hotspots[0]).toMatchObject({ mastery: 0.2, attempts: 0, dueAt: null });
    expect(mastery.overall).toBeCloseTo(0.2);
  });

  it('replays events with a deterministic (timestamp, id) tie-break', () => {
    const first = event({ id: 'a', payload: { correct: false } });
    const second = event({ id: 'b', payload: { correct: true } });
    const forward = computeMastery([first, second], ['aorta']);
    const reversed = computeMastery([second, first], ['aorta']);
    expect(forward).toEqual(reversed);
    expect(forward.hotspots[0].correct).toBe(1);
    expect(forward.hotspots[0].mastery).toBeGreaterThan(0.2);
  });

  it('advances FSRS due dates after a correct review', () => {
    const first = event({ id: 'one', payload: { correct: true, grade: 'good' }, timestamp: NOW });
    const second = event({
      id: 'two',
      payload: { correct: true, grade: 'good' },
      timestamp: NOW + 86_400_000,
    });
    const mastery = computeMastery([first, second], ['aorta']);
    const due = Date.parse(mastery.hotspots[0].dueAt ?? '');
    expect(Number.isFinite(due)).toBe(true);
    expect(due).toBeGreaterThan(NOW);
  });

  it('computes Earth mastery, FSRS due cards and next-best review', () => {
    const mastery = computeMastery(
      [
        event({
          hotspotId: 'outer_core',
          id: 'earth:outer_core:1',
          lessonId: EARTH_LESSON.id,
          payload: { correct: true, grade: 'good' },
        }),
        event({ id: 'heart:left_ventricle:1' }),
      ],
      EARTH_LESSON.hotspots,
    );
    expect(mastery.hotspots.map((hotspot) => hotspot.hotspotId)).toEqual(EARTH_LESSON.hotspots);
    const outerCore = mastery.hotspots.find((hotspot) => hotspot.hotspotId === 'outer_core');
    expect(outerCore?.correct).toBe(1);
    expect(Date.parse(outerCore?.dueAt ?? '')).toBeGreaterThan(NOW);
    expect(recommendNext(mastery, EARTH_LESSON.hotspots)).toBe('crust');
  });

  it('schedules a review card much sooner after Again than after Good', () => {
    const again = computeMastery(
      [event({ id: 'grade', payload: { correct: false, grade: 'again' } })],
      ['aorta'],
    );
    const good = computeMastery(
      [event({ id: 'grade', payload: { correct: true, grade: 'good' } })],
      ['aorta'],
    );
    const againDue = Date.parse(again.hotspots[0].dueAt ?? '');
    const goodDue = Date.parse(good.hotspots[0].dueAt ?? '');
    expect(againDue).toBeLessThan(goodDue);
    expect(againDue).toBeLessThanOrEqual(NOW + 60_000);
    expect(goodDue).toBeGreaterThan(NOW + 60_000);
  });
});

describe('recommendNext', () => {
  it('chooses the lowest mastery hotspot', () => {
    expect(recommendNext(view([0.6, 0.25, 0.4, 0.5, 0.3, 0.2]))).toBe('aortic_valve');
  });

  it('breaks mastery ties by attempts, then canonical hotspot order', () => {
    const tied = view([0.4, 0.4, 0.4, 0.4, 0.4, 0.4]);
    tied.hotspots[3].attempts = 2;
    expect(recommendNext(tied)).toBe('left_ventricle');
  });

  it('ignores mastered hotspots unless all are mastered', () => {
    expect(recommendNext(view([0.9, 0.9, 0.4, 0.9, 0.9, 0.9]))).toBe('aorta');
    expect(recommendNext(view([0.9, 0.9, 0.9, 0.9, 0.9, 0.9]))).toBeNull();
  });

  it('uses a custom hotspot order for a non-heart lesson', () => {
    const brain: MasteryView = {
      hotspots: [
        { hotspotId: 'hippocampus', mastery: 0.4, attempts: 0, correct: 0, dueAt: null },
        { hotspotId: 'cortex', mastery: 0.4, attempts: 0, correct: 0, dueAt: null },
      ],
      overall: 0.4,
      updatedAt: null,
    };
    expect(recommendNext(brain, ['cortex', 'hippocampus'])).toBe('cortex');
  });
});
