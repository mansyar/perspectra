import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { lesson } from '../../api/src/db/schema';
import type { LlmPort } from '../../api/src/lib/llm';
import { ingestLessons, type IngestOptions } from '../../scripts/embed-lessons';

interface Upsert {
  set: Record<string, unknown>;
  table: unknown;
  target: unknown;
  values: Record<string, unknown>;
}

function fakeDatabase() {
  const embeddings = new Map<string, Record<string, unknown>>();
  const lessons = new Map<string, Record<string, unknown>>();
  const upserts: Upsert[] = [];
  const db = {
    insert(table: unknown) {
      return {
        values(values: Record<string, unknown>) {
          return {
            async onConflictDoUpdate(config: { set: Record<string, unknown>; target: unknown }) {
              upserts.push({ ...config, table, values });
              const rows = table === lesson ? lessons : embeddings;
              rows.set(String(values.id), {
                ...rows.get(String(values.id)),
                ...values,
                ...config.set,
              });
            },
          };
        },
      };
    },
  };
  return {
    db: db as unknown as NonNullable<IngestOptions['db']>,
    embeddings,
    lessons,
    upserts,
  };
}

function documentAdapter(vectors?: number[][]): Pick<LlmPort, 'embed'> {
  const vector = Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0));
  return {
    embed: vi.fn(
      async (_texts: readonly string[], _purpose?: 'document' | 'query') =>
        vectors ?? Array.from({ length: _texts.length }, () => [...vector]),
    ),
  };
}

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

describe('Gemini lesson ingestion contract', () => {
  it('discovers all lessons and embeds every Earth hotspot chunk as a document', async () => {
    const adapter = documentAdapter();
    const records: Record<string, unknown>[] = [];
    const summaries = await ingestLessons({
      adapter,
      stdout: { write: (line) => records.push(JSON.parse(line) as Record<string, unknown>) },
    });

    expect(summaries).toEqual([
      { chunks: 18, lessonId: 'earth-interior' },
      { chunks: 18, lessonId: 'heart' },
    ]);
    const earth = records.filter((record) => record.lessonId === 'earth-interior');
    expect(earth).toHaveLength(18);
    expect([...new Set(earth.map((record) => record.hotspotId))]).toEqual([
      'crust',
      'upper_mantle',
      'lower_mantle',
      'outer_core',
      'inner_core',
      'lithosphere',
    ]);
    expect(earth.every((record) => Array.isArray(record.embedding))).toBe(true);
    expect(adapter.embed).toHaveBeenCalledTimes(2);
    for (const call of vi.mocked(adapter.embed).mock.calls) {
      expect(call[0]).toHaveLength(18);
      expect(call[1]).toBe('document');
    }
  });

  it('upserts lessons and deterministic embedding rows without deleting existing data', async () => {
    const store = fakeDatabase();
    const legacy = { chunk: 'Keep this row', id: 'legacy:chunk:overview', lessonId: 'legacy' };
    store.embeddings.set(legacy.id, legacy);
    const adapter = documentAdapter();

    await ingestLessons({ adapter, db: store.db });
    await ingestLessons({ adapter, db: store.db });

    expect(store.upserts).toHaveLength(76);
    expect(store.lessons.size).toBe(2);
    expect(store.embeddings.size).toBe(37);
    expect(store.embeddings.get(legacy.id)).toEqual(legacy);
    expect(store.lessons.get('earth-interior')).toMatchObject({
      description:
        "A guided tour of Earth's layered interior, from the rigid surface to the solid inner core.",
      hotspots: [
        'crust',
        'upper_mantle',
        'lower_mantle',
        'outer_core',
        'inner_core',
        'lithosphere',
      ],
      title: 'Inside Earth',
    });
    const earthEmbeddings = [...store.embeddings.values()].filter(
      (row) => row.lessonId === 'earth-interior',
    );
    expect(earthEmbeddings).toHaveLength(18);
    expect(
      earthEmbeddings.every((row) => Array.isArray(row.embedding) && row.embedding.length === 1536),
    ).toBe(true);
  });

  it('rejects wrong-length embeddings before writing any rows', async () => {
    const store = fakeDatabase();
    const existing = { hotspots: ['crust'], id: 'earth-interior', title: 'Existing' };
    store.lessons.set(existing.id, existing);

    await expect(ingestLessons({ adapter: documentAdapter([[1]]), db: store.db })).rejects.toThrow(
      'Invalid earth-interior document embeddings',
    );
    expect(store.upserts).toHaveLength(0);
    expect([...store.lessons.values()]).toEqual([existing]);
    expect(store.embeddings.size).toBe(0);
  });

  it('documents Gemini-only embedding configuration and commands', () => {
    expect(readme).toContain('gemini-embedding-2');
    expect(readme).toContain('batchEmbedContents');
    expect(readme).toContain('LLM_API_KEY=<your-key>');
    expect(readme).not.toMatch(/OpenAI-compatible|api\.openai\.com|\/v1\/embeddings/i);
  });
});
