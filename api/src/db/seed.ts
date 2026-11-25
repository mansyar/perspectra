import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { parseLessonContent, type LessonContent } from '../lib/lesson-content';
import * as schema from './schema';

const LESSON_DIR = new URL('../../../src/content/lessons/', import.meta.url);

/** Retained for consumers of the original heart-only seed API. */
export const heartHotspotIds = [
  'left_ventricle',
  'right_ventricle',
  'aorta',
  'pulmonary_artery',
  'mitral_valve',
  'aortic_valve',
] as const;

/** Discovers database metadata from the same MDX collection used by the site. */
export function discoverLessons(directory: URL = LESSON_DIR): LessonContent[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.mdx'))
    .toSorted()
    .map((file) => {
      const lessonId = file.replace(/\.mdx$/, '');
      return parseLessonContent(readFileSync(new URL(file, directory), 'utf8'), lessonId);
    });
}

/** Additive, idempotent upsert for every discovered lesson. */
export async function seedLessons(
  db: NeonDatabase<typeof schema>,
  lessons: readonly LessonContent[] = discoverLessons(),
): Promise<void> {
  for (const lesson of lessons) {
    const values = {
      description: lesson.description,
      hotspots: lesson.hotspots,
      id: lesson.id,
      title: lesson.title,
    };
    await db
      .insert(schema.lesson)
      .values(values)
      .onConflictDoUpdate({ target: schema.lesson.id, set: values });
  }
}

/** Compatibility wrapper for callers that explicitly seed only the original lesson. */
export async function seedHeart(db: NeonDatabase<typeof schema>): Promise<void> {
  const heart = discoverLessons().find((lesson) => lesson.id === 'heart');
  if (!heart) {
    throw new Error('Heart lesson content was not found');
  }
  await seedLessons(db, [heart]);
}

/** CLI entry point: only here is DATABASE_URL read and a connection opened. */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for db:seed');
  }
  const db = drizzle(new Pool({ connectionString }), { schema });
  const lessons = discoverLessons();
  await seedLessons(db, lessons);
  for (const lesson of lessons) {
    process.stdout.write(`Seeded ${lesson.id} (${lesson.hotspots.length} hotspots)\n`);
  }
}

/** Importing this module for tests must not connect or exit the process. */
function invokedDirectly(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
