import { eq } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { lessonEmbedding, schema } from '../db/schema';
import type { LessonChunk } from './retrieval';

/** Chunk source used by tutor and quiz. Tests inject a fake implementation. */
export interface LessonChunkRepository {
  getChunks(lessonId: string): Promise<LessonChunk[]>;
}

function parseEmbedding(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    const numbers = value.map(Number);
    return numbers.every(Number.isFinite) ? numbers : undefined;
  }
  if (typeof value === 'string') {
    try {
      return parseEmbedding(JSON.parse(value));
    } catch {
      const parts = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .filter((part) => part.length > 0);
      const numbers = parts.map(Number);
      return numbers.length > 0 && numbers.every(Number.isFinite) ? numbers : undefined;
    }
  }
  return undefined;
}

/** Drizzle-backed source over the pgvector `lesson_embedding` table. */
export function createDrizzleLessonChunkRepository(
  db: NeonDatabase<typeof schema>,
): LessonChunkRepository {
  return {
    async getChunks(lessonId: string): Promise<LessonChunk[]> {
      const rows = await db
        .select({
          embedding: lessonEmbedding.embedding,
          hotspotId: lessonEmbedding.hotspotId,
          id: lessonEmbedding.id,
          lessonId: lessonEmbedding.lessonId,
          text: lessonEmbedding.chunk,
        })
        .from(lessonEmbedding)
        .where(eq(lessonEmbedding.lessonId, lessonId));
      return rows.map((row) => ({
        embedding: parseEmbedding(row.embedding),
        hotspotId: row.hotspotId ?? '',
        id: row.id,
        layer: row.id.split(':').at(-1) ?? '',
        lessonId: row.lessonId,
        text: row.text,
      }));
    },
  };
}
