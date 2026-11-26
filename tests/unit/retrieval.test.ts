import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildChunks,
  cosine,
  hotspotIdsFromChunks,
  lexicalScore,
  loadLessonChunks,
  retrieveChunks,
  type LessonChunk,
} from '../../api/src/lib/retrieval';

const MDX = `
<div id="aorta" data-hotspot="aorta">
  <h2>Aorta</h2>
  <p data-layer="overview"><strong>Overview.</strong> The aorta carries oxygenated blood.</p>
  <p data-layer="clinical">Aortic dissection is an emergency.</p>
</div>
<div id="unknown" data-hotspot="unknown">
  <p data-layer="overview">Ignored content.</p>
</div>
`;

function chunk(overrides: Partial<LessonChunk> = {}): LessonChunk {
  return {
    hotspotId: 'aorta',
    id: 'heart:aorta:overview',
    layer: 'overview',
    lessonId: 'heart',
    text: 'The aorta carries oxygenated blood.',
    ...overrides,
  };
}

describe('buildChunks', () => {
  it('parses hotspot/layer sections and ignores unknown hotspots', () => {
    const chunks = buildChunks(MDX, 'heart', ['aorta']);
    expect(chunks.map((entry) => entry.id)).toEqual([
      'heart:aorta:overview',
      'heart:aorta:clinical',
    ]);
    expect(chunks[0].text).toContain('The aorta carries oxygenated blood.');
    expect(chunks[0].text).not.toContain('<strong>');
  });

  it('derives hotspot IDs from the MDX when no allowlist is supplied', () => {
    expect(buildChunks(MDX, 'heart').map((entry) => entry.hotspotId)).toEqual([
      'aorta',
      'aorta',
      'unknown',
    ]);
  });

  it('caps oversized layer text and skips empty layers', () => {
    const long = `aorta ${'filler '.repeat(700)}`;
    const mdx = `<div data-hotspot="aorta"><p data-layer="overview">${long}</p><p data-layer="detail">   </p></div>`;
    const chunks = buildChunks(mdx, 'heart');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(3600);
  });
});

describe('authored lesson chunk source', () => {
  const lessonDir = new URL('../../src/content/lessons/', import.meta.url);
  const files = readdirSync(lessonDir)
    .filter((file) => file.endsWith('.mdx'))
    .toSorted();

  it('returns non-empty, content-derived chunks for every authored lesson', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const lessonId = file.replace(/\.mdx$/, '');
      const mdx = readFileSync(new URL(file, lessonDir), 'utf8');
      const expected = buildChunks(mdx, lessonId);
      const chunks = loadLessonChunks(lessonId);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.map((entry) => entry.id)).toEqual(expected.map((entry) => entry.id));
      expect(chunks.map((entry) => entry.text)).toEqual(expected.map((entry) => entry.text));
      for (const entry of chunks) {
        expect(entry.lessonId).toBe(lessonId);
        expect(entry.id).toBe(`${lessonId}:${entry.hotspotId}:${entry.layer}`);
        expect(entry.text.length).toBeGreaterThan(0);
        expect(entry.text.length).toBeLessThanOrEqual(3600);
      }
    }
  });

  it('filters loaded chunks by hotspot IDs derived from the lesson MDX', () => {
    const lessonId = files[0].replace(/\.mdx$/, '');
    const hotspotId = buildChunks(readFileSync(new URL(files[0], lessonDir), 'utf8'), lessonId)[0]
      .hotspotId;
    const chunks = loadLessonChunks(lessonId, [hotspotId]);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((entry) => entry.hotspotId === hotspotId)).toBe(true);
  });

  it('returns no chunks for a lesson that is not authored', () => {
    expect(loadLessonChunks('not_an_authored_lesson')).toEqual([]);
  });
});

describe('cosine', () => {
  it('scores identical vectors as 1 and orthogonal vectors as 0', () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
  });

  it('returns 0 for missing, mismatched or zero-norm vectors', () => {
    expect(cosine([], [1])).toBe(0);
    expect(cosine([1], [1, 0])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe('lexicalScore', () => {
  it('rewards matching terms and ignores stop words', () => {
    expect(lexicalScore('The ventricle generates pressure', 'ventricle pressure')).toBeGreaterThan(
      0,
    );
    expect(lexicalScore('The ventricle generates pressure', 'chocolate cake')).toBe(0);
    expect(lexicalScore('aorta', 'the')).toBe(0);
    expect(lexicalScore('', 'aorta')).toBe(0);
  });
});

describe('retrieveChunks', () => {
  const chunks = [
    chunk(),
    chunk({
      hotspotId: 'mitral_valve',
      id: 'heart:mitral_valve:overview',
      text: 'The mitral valve prevents backflow.',
    }),
  ];

  it('falls back to lexical-only retrieval when no embedding is available', () => {
    const results = retrieveChunks(chunks, 'aorta', []);
    expect(results).toHaveLength(1);
    expect(results[0].chunk.id).toBe('heart:aorta:overview');
    expect(results[0].cosine).toBe(0);
  });

  it('filters on cosine when embeddings are supplied and weights the score', () => {
    const embedded = [
      chunk({ embedding: [1, 0] }),
      chunk({
        embedding: [0, 1],
        hotspotId: 'mitral_valve',
        id: 'heart:mitral_valve:overview',
        text: 'The mitral valve prevents backflow.',
      }),
    ];
    const results = retrieveChunks(embedded, 'aorta', [1, 0], 4, 0.7);
    expect(results).toHaveLength(1);
    expect(results[0].chunk.id).toBe('heart:aorta:overview');
    expect(results[0].score).toBeGreaterThanOrEqual(0.7);
  });

  it('sorts by score descending then id ascending', () => {
    const results = retrieveChunks(
      [
        chunk({ id: 'heart:b', text: 'aorta aorta' }),
        chunk({ id: 'heart:a', text: 'aorta aorta' }),
      ],
      'aorta',
      [],
    );
    expect(results.map((result) => result.chunk.id)).toEqual(['heart:a', 'heart:b']);
  });
});

describe('hotspotIdsFromChunks', () => {
  it('derives a unique hotspot vocabulary from non-heart chunks', () => {
    expect(
      hotspotIdsFromChunks([
        chunk({ hotspotId: 'planet_core', id: 'planets:planet_core:overview' }),
        chunk({ hotspotId: 'planet_core', id: 'planets:planet_core:detail', layer: 'detail' }),
        chunk({ hotspotId: 'crust', id: 'planets:crust:overview' }),
      ]),
    ).toEqual(['planet_core', 'crust']);
  });
});
