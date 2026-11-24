import { readFileSync } from 'node:fs';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { describe, expect, it } from 'vitest';
import * as schema from '../../api/src/db/schema';
import { heartHotspotIds, seedHeart } from '../../api/src/db/seed';

interface LessonRow {
  id: string;
  title: string;
  description?: string | null;
  hotspots: string[];
}

interface Upsert {
  table: unknown;
  values: LessonRow;
  target: unknown;
  set: Partial<LessonRow>;
}

/** Minimal Drizzle-shaped fake: records upserts and keeps the last row per id. */
function fakeDatabase(): {
  db: NeonDatabase<typeof schema>;
  rows: Map<string, LessonRow>;
  upserts: Upsert[];
} {
  const rows = new Map<string, LessonRow>();
  const upserts: Upsert[] = [];
  const db = {
    insert(table: unknown) {
      return {
        values(values: LessonRow) {
          return {
            async onConflictDoUpdate(config: { target: unknown; set: Partial<LessonRow> }) {
              upserts.push({ table, values, target: config.target, set: config.set });
              rows.set(values.id, { ...values, ...config.set });
            },
          };
        },
      };
    },
  };
  return { db: db as unknown as NeonDatabase<typeof schema>, rows, upserts };
}

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe('database package scripts', () => {
  it('pushes with Drizzle Kit using the checked-in config', () => {
    expect(pkg.scripts['db:push']).toMatch(/^drizzle-kit push\b/);
    expect(pkg.scripts['db:push']).toContain('drizzle.config.ts');
  });

  it('seeds by running the tsx CLI entry', () => {
    expect(pkg.scripts['db:seed']).toBe('tsx api/src/db/seed.ts');
  });

  it('pins tsx as an exact dev dependency version', () => {
    expect(pkg.devDependencies.tsx).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('seedHeart', () => {
  it('seeds one heart lesson with six hotspots and stays idempotent across reruns', async () => {
    const { db, rows, upserts } = fakeDatabase();

    await seedHeart(db);
    await seedHeart(db);

    expect(upserts).toHaveLength(2);
    expect(upserts[0]?.table).toBe(schema.lesson);
    expect(upserts[0]?.target).toBe(schema.lesson.id);
    expect(rows.size).toBe(1);
    const heart = rows.get('heart');
    expect(heart).toBeDefined();
    expect(heart?.hotspots).toEqual([...heartHotspotIds]);
    expect(heart?.hotspots).toHaveLength(6);
  });

  it('sets the canonical lesson fields on every upsert', async () => {
    const { db, upserts } = fakeDatabase();
    await seedHeart(db);
    expect(upserts[0]?.set).toEqual({
      id: 'heart',
      title: 'The Human Heart',
      description: 'A guided tour of cardiac anatomy through six interactive landmarks.',
      hotspots: [...heartHotspotIds],
    });
  });
});
