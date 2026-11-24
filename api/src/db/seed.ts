import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

/** Canonical hotspot IDs shared with the MDX manifest and GLB mesh names. */
export const heartHotspotIds = [
  'left_ventricle',
  'right_ventricle',
  'aorta',
  'pulmonary_artery',
  'mitral_valve',
  'aortic_valve',
] as const;

const heartValues = {
  id: 'heart',
  title: 'The Human Heart',
  description: 'A guided tour of cardiac anatomy through six interactive landmarks.',
  hotspots: [...heartHotspotIds],
};

/** Idempotent seed for the single lesson in the showcase MVP. */
export async function seedHeart(db: NeonDatabase<typeof schema>): Promise<void> {
  await db
    .insert(schema.lesson)
    .values(heartValues)
    .onConflictDoUpdate({ target: schema.lesson.id, set: heartValues });
}

/** CLI entry point: only here is DATABASE_URL read and a connection opened. */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for db:seed');
  }
  const db = drizzle(new Pool({ connectionString }), { schema });
  await seedHeart(db);
  process.stdout.write(`Seeded heart (${heartHotspotIds.length} hotspots)\n`);
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
