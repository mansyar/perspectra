import { z } from 'zod';

/** Append-only learning event types accepted by the progress API. */
export const learningEventTypes = ['view', 'answer', 'quiz_result', 'reflection'] as const;

export const learningEventSchema = z.object({
  id: z.string().min(1),
  lessonId: z.string().min(1),
  hotspotId: z.string().min(1),
  type: z.enum(learningEventTypes),
  payload: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.number().int().nonnegative(),
});

export const syncBatchSchema = z.object({
  events: z.array(learningEventSchema).max(1000),
});

export type LearningEvent = z.infer<typeof learningEventSchema>;
export type LearningEventInput = z.input<typeof learningEventSchema>;

/** A single hotspot's current value under last-write-wins. */
export interface HotspotProgress {
  hotspotId: string;
  eventId: string;
  type: LearningEvent['type'];
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface LessonProgress {
  lessonId: string;
  hotspots: HotspotProgress[];
  updatedAt: number;
}

export interface ProgressState {
  userId: string;
  lessons: LessonProgress[];
  eventCount: number;
}

/** Orders events by wall-clock time, then by ID for a deterministic tie-break. */
export function compareByRecency(left: LearningEvent, right: LearningEvent): number {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp - right.timestamp;
  }
  return left.id.localeCompare(right.id);
}

/** Builds the derived, session-scoped view from the append-only event log. */
export function buildProgressState(userId: string, events: LearningEvent[]): ProgressState {
  const byLesson = new Map<string, Map<string, LearningEvent>>();

  for (const event of events) {
    const hotspots = byLesson.get(event.lessonId) ?? new Map<string, LearningEvent>();
    const current = hotspots.get(event.hotspotId);
    if (!current || compareByRecency(event, current) > 0) {
      hotspots.set(event.hotspotId, event);
    }
    byLesson.set(event.lessonId, hotspots);
  }

  const lessons = Array.from(byLesson.entries())
    .map(([lessonId, hotspots]) => ({
      lessonId,
      hotspots: Array.from(hotspots.values())
        .map((event) => ({
          hotspotId: event.hotspotId,
          eventId: event.id,
          type: event.type,
          timestamp: event.timestamp,
          payload: event.payload,
        }))
        .toSorted((left, right) => left.hotspotId.localeCompare(right.hotspotId)),
      updatedAt: Math.max(...Array.from(hotspots.values(), (event) => event.timestamp)),
    }))
    .toSorted((left, right) => left.lessonId.localeCompare(right.lessonId));

  return { userId, lessons, eventCount: events.length };
}
