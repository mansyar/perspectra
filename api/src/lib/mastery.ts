import { createEmptyCard, FSRS, Rating, type Card, type Grade } from 'ts-fsrs';
import { compareByRecency, type LearningEvent } from './events';
import { DEFAULT_HOTSPOTS } from './retrieval';

export const MASTERY_THRESHOLD = 0.85;
export const PRIOR_MASTERY = 0.2;

const fsrs = new FSRS({
  enable_fuzz: false,
  maximum_interval: 36_500,
  request_retention: 0.9,
});

export interface BktParams {
  learn?: number;
  slip?: number;
  guess?: number;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Standard one-step Bayesian Knowledge Tracing update, fully deterministic. */
export function bktUpdate(prior: number, correct: boolean, params: BktParams = {}): number {
  const { learn = 0.25, slip = 0.1, guess = 0.2 } = params;
  const p = clamp(prior);
  const denominator = correct ? p * (1 - slip) + (1 - p) * guess : p * slip + (1 - p) * (1 - guess);
  if (denominator === 0) {
    return clamp(p + (1 - p) * learn);
  }
  const posterior = correct ? (p * (1 - slip)) / denominator : (p * slip) / denominator;
  return clamp(posterior + (1 - posterior) * learn);
}

export interface HotspotMastery {
  hotspotId: string;
  mastery: number;
  attempts: number;
  correct: number;
  dueAt: string | null;
}

export interface MasteryView {
  hotspots: HotspotMastery[];
  overall: number;
  updatedAt: number | null;
}

const gradeMap = {
  again: Rating.Again,
  easy: Rating.Easy,
  good: Rating.Good,
  hard: Rating.Hard,
} as const;

type ExplicitGrade = keyof typeof gradeMap;

function gradeFor(event: LearningEvent, correct: boolean): Grade {
  const explicit = event.payload.grade;
  if (typeof explicit === 'string' && explicit in gradeMap) {
    return gradeMap[explicit as ExplicitGrade];
  }
  return correct ? Rating.Good : Rating.Again;
}

interface HotspotState {
  attempts: number;
  card: Card;
  correct: number;
  dueAt: string | null;
  mastery: number;
}

/**
 * Replays the append-only event log into a per-hotspot mastery view. Card state
 * is derived from grades in (timestamp, id) order; no extra storage is needed.
 */
export function computeMastery(
  events: readonly LearningEvent[],
  hotspots: readonly string[],
): MasteryView {
  const allowed = new Set(hotspots);
  const states = new Map<string, HotspotState>(
    hotspots.map((hotspotId) => [
      hotspotId,
      {
        attempts: 0,
        card: createEmptyCard(new Date(0)),
        correct: 0,
        dueAt: null,
        mastery: PRIOR_MASTERY,
      },
    ]),
  );

  const relevant = events
    .filter(
      (event) =>
        (event.type === 'answer' || event.type === 'quiz_result') && allowed.has(event.hotspotId),
    )
    .toSorted(compareByRecency);

  let updatedAt: number | null = null;
  for (const event of relevant) {
    const state = states.get(event.hotspotId);
    if (!state) {
      continue;
    }
    const correct = event.payload.correct === true;
    const now = new Date(event.timestamp);
    state.attempts += 1;
    if (correct) {
      state.correct += 1;
    }
    state.mastery = bktUpdate(state.mastery, correct);
    state.card = fsrs.next(state.card, now, gradeFor(event, correct)).card;
    state.dueAt = state.card.due.toISOString();
    updatedAt = Math.max(updatedAt ?? 0, event.timestamp);
  }

  const views = hotspots.map((hotspotId) => {
    const state = states.get(hotspotId);
    return {
      hotspotId,
      attempts: state?.attempts ?? 0,
      correct: state?.correct ?? 0,
      dueAt: state?.dueAt ?? null,
      mastery: state?.mastery ?? PRIOR_MASTERY,
    };
  });

  return {
    hotspots: views,
    overall:
      views.length === 0 ? 0 : views.reduce((sum, view) => sum + view.mastery, 0) / views.length,
    updatedAt,
  };
}

/** Lowest mastery first; mastered hotspots are skipped unless all are mastered. */
export function recommendNext(
  view: MasteryView,
  hotspots: readonly string[] = DEFAULT_HOTSPOTS,
): string | null {
  const order = new Map<string, number>(hotspots.map((id, index) => [id, index]));
  const candidates = view.hotspots.filter((hotspot) => hotspot.mastery < MASTERY_THRESHOLD);
  if (candidates.length === 0) {
    return null;
  }
  return (
    candidates.toSorted(
      (left, right) =>
        left.mastery - right.mastery ||
        left.attempts - right.attempts ||
        (order.get(left.hotspotId) ?? hotspots.length) -
          (order.get(right.hotspotId) ?? hotspots.length),
    )[0]?.hotspotId ?? null
  );
}
