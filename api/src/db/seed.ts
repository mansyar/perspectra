import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
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
