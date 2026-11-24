import { eq } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema';
import { buildProgressState, type LearningEvent, type ProgressState } from './events';

/** Storage boundary for progress. Both implementations are session-scoped by userId. */
export interface ProgressRepository {
  getProgress(userId: string): Promise<ProgressState>;
  appendEvents(userId: string, events: LearningEvent[]): Promise<ProgressState>;
  getEvents(userId: string): Promise<LearningEvent[]>;
}

/** Deterministic in-memory store used by integration tests; no network or credentials. */
export class InMemoryProgressRepository implements ProgressRepository {
  private readonly events = new Map<string, Map<string, LearningEvent>>();

  async getEvents(userId: string): Promise<LearningEvent[]> {
    const owned = this.events.get(userId);
    if (!owned) {
      return [];
    }
    return Array.from(owned.values()).map((event) => ({ ...event, payload: { ...event.payload } }));
  }

  async appendEvents(userId: string, events: LearningEvent[]): Promise<ProgressState> {
    const owned = this.events.get(userId) ?? new Map<string, LearningEvent>();
    for (const event of events) {
      if (!owned.has(event.id)) {
        owned.set(event.id, { ...event, payload: { ...event.payload } });
      }
    }
    this.events.set(userId, owned);
    return this.getProgress(userId);
  }

  async getProgress(userId: string): Promise<ProgressState> {
    return buildProgressState(userId, await this.getEvents(userId));
  }
}

/** Production store backed by Neon through Drizzle. */
export function createNeonProgressRepository(db: NeonDatabase<typeof schema>): ProgressRepository {
  return {
    async getEvents(userId: string): Promise<LearningEvent[]> {
      const rows = await db
        .select()
        .from(schema.learningEvent)
        .where(eq(schema.learningEvent.userId, userId));
      return rows.map((row) => ({
        id: row.id,
        lessonId: row.lessonId,
        hotspotId: row.hotspotId,
        type: row.type as LearningEvent['type'],
        payload: row.payload as Record<string, unknown>,
        timestamp: row.timestamp,
      }));
    },

    async appendEvents(userId: string, events: LearningEvent[]): Promise<ProgressState> {
      if (events.length > 0) {
        await db
          .insert(schema.learningEvent)
          .values(
            events.map((event) => ({
              id: event.id,
              userId,
              lessonId: event.lessonId,
              hotspotId: event.hotspotId,
              type: event.type,
              payload: event.payload,
              timestamp: event.timestamp,
            })),
          )
          .onConflictDoNothing({ target: schema.learningEvent.id });
      }
      return this.getProgress(userId);
    },

    async getProgress(userId: string): Promise<ProgressState> {
      return buildProgressState(userId, await this.getEvents(userId));
    },
  };
}
