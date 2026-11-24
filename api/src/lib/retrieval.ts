/**
 * Course retrieval: chunk the MDX prose, then rank chunks with a hybrid of
 * pgvector cosine similarity and dependency-free BM25-like lexical overlap.
 */

export interface LessonChunk {
  id: string;
  lessonId: string;
  hotspotId: string;
  layer: string;
  text: string;
  /** Optional precomputed embedding attached by the embedding loader/DB. */
  embedding?: readonly number[];
}

/** Canonical hotspot IDs for the single showcase lesson. */
export const DEFAULT_HOTSPOTS = [
  'left_ventricle',
  'right_ventricle',
  'aorta',
  'pulmonary_artery',
  'mitral_valve',
  'aortic_valve',
] as const;

/**
 * TEMPORARY MVP MEASURE: the Worker cannot import MDX, so the committed prose
 * is mirrored here until embeddings are generated from the content collection
 * at build time. Keep this string in sync with src/content/lessons/heart.mdx.
 */
export const HEART_LESSON_MDX = `
<div id="left_ventricle" data-hotspot="left_ventricle">
  <h2>Left ventricle</h2>
  <p data-layer="overview">
    <strong>Overview.</strong> The left ventricle is the strongest chamber. It pushes oxygen-rich
    blood out through the aorta and into the systemic circulation.
  </p>
  <p data-layer="detail">
    <strong>Detail.</strong> Its wall is roughly three times thicker than the right ventricle
    because it must generate pressure sufficient to reach the brain, kidneys, and toes.
  </p>
  <p data-layer="clinical">
    <strong>Clinical note.</strong> A weakened left ventricle reduces ejection fraction and is the
    most common cause of systolic heart failure.
  </p>
</div>

<div id="right_ventricle" data-hotspot="right_ventricle">
  <h2>Right ventricle</h2>
  <p data-layer="overview">
    <strong>Overview.</strong> The right ventricle receives oxygen-poor blood from the right atrium
    and sends it toward the lungs through the pulmonary artery.
  </p>
  <p data-layer="detail">
    <strong>Detail.</strong> Its crescent-shaped cavity wraps around the left ventricle and operates
    at a much lower pressure, because the pulmonary circuit offers far less resistance.
  </p>
  <p data-layer="clinical">
    <strong>Clinical note.</strong> Right ventricular failure often shows as peripheral edema and is
    a common consequence of severe lung disease.
  </p>
</div>

<div id="aorta" data-hotspot="aorta">
  <h2>Aorta</h2>
  <p data-layer="overview">
    <strong>Overview.</strong> The aorta is the largest artery in the body. It carries oxygenated
    blood from the left ventricle to every systemic branch.
  </p>
  <p data-layer="detail">
    <strong>Detail.</strong> The ascending aorta gives off the coronary arteries just above the
    aortic valve, then arches to supply the head and upper limbs before descending.
  </p>
  <p data-layer="clinical">
    <strong>Clinical note.</strong> Sudden tearing chest pain can indicate an aortic dissection, a
    tear in the inner wall that requires emergency care.
  </p>
</div>

<div id="pulmonary_artery" data-hotspot="pulmonary_artery">
  <h2>Pulmonary artery</h2>
  <p data-layer="overview">
    <strong>Overview.</strong> The pulmonary artery is unusual: it is an artery that carries
    oxygen-poor blood, on its way to the lungs for gas exchange.
  </p>
  <p data-layer="detail">
    <strong>Detail.</strong> The main trunk branches into left and right pulmonary arteries,
    following the bronchi into each lung and eventually forming a capillary network around the
    alveoli.
  </p>
  <p data-layer="clinical">
    <strong>Clinical note.</strong> A blockage here is a pulmonary embolism; elevated pressure in
    this circuit is pulmonary hypertension.
  </p>
</div>

<div id="mitral_valve" data-hotspot="mitral_valve">
  <h2>Mitral valve</h2>
  <p data-layer="overview">
    <strong>Overview.</strong> The mitral valve sits between the left atrium and left ventricle. It
    lets blood fill the ventricle and then seals to prevent backflow during contraction.
  </p>
  <p data-layer="detail">
    <strong>Detail.</strong> Two leaflets are tethered to papillary muscles by chordae tendineae,
    which stop the leaflets from prolapsing into the atrium under pressure.
  </p>
  <p data-layer="clinical">
    <strong>Clinical note.</strong> Mitral regurgitation produces a systolic murmur; a common
    degenerative cause is mitral valve prolapse.
  </p>
</div>

<div id="aortic_valve" data-hotspot="aortic_valve">
  <h2>Aortic valve</h2>
  <p data-layer="overview">
    <strong>Overview.</strong> The aortic valve guards the exit from the left ventricle into the
    aorta, opening during systole and closing during diastole.
  </p>
  <p data-layer="detail">
    <strong>Detail.</strong> It usually has three semilunar cusps whose pockets fill with
    backflowing blood to seal the opening, and whose nearby sinuses feed the coronary arteries.
  </p>
  <p data-layer="clinical">
    <strong>Clinical note.</strong> A congenital bicuspid aortic valve is common and can lead to
    stenosis or regurgitation later in life.
  </p>
</div>
`;

const SECTION_PATTERN = /<div\b[^>]*\bdata-hotspot=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>/g;
const LAYER_PATTERN = /<p\b[^>]*\bdata-layer=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/g;

// Heuristic token budget: ~4 characters per token, capped inside 512-1024.
const MAX_CHUNK_CHARS = 3600;

function capChunk(text: string): string {
  if (text.length <= MAX_CHUNK_CHARS) {
    return text;
  }
  const cut = text.slice(0, MAX_CHUNK_CHARS);
  const boundary = cut.lastIndexOf(' ');
  return (boundary > MAX_CHUNK_CHARS / 2 ? cut.slice(0, boundary) : cut).trimEnd();
}

function textContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits MDX sections into one retrievable chunk per hotspot/layer pair. */
export function buildChunks(
  mdx: string,
  lessonId: string,
  hotspots?: readonly string[],
): LessonChunk[] {
  const derived = [...mdx.matchAll(SECTION_PATTERN)].map((section) => section[1]);
  const allowed = new Set(hotspots ?? derived);
  const chunks: LessonChunk[] = [];
  for (const section of mdx.matchAll(SECTION_PATTERN)) {
    const hotspotId = section[1];
    if (!allowed.has(hotspotId)) {
      continue;
    }
    for (const layer of section[2].matchAll(LAYER_PATTERN)) {
      const text = capChunk(textContent(layer[2]));
      if (text.length === 0) {
        continue;
      }
      chunks.push({
        id: `${lessonId}:${hotspotId}:${layer[1]}`,
        lessonId,
        hotspotId,
        layer: layer[1],
        text,
      });
    }
  }
  return chunks;
}

/** Server-side chunk loader for the Worker path (no node:fs in a Worker). */
export function loadLessonChunks(
  lessonId: string,
  hotspots: readonly string[] = DEFAULT_HOTSPOTS,
): LessonChunk[] {
  return lessonId === 'heart' ? buildChunks(HEART_LESSON_MDX, lessonId, hotspots) : [];
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'is',
  'it',
  'for',
  'on',
  'with',
  'as',
  'by',
  'that',
  'this',
  'are',
  'be',
  'from',
  'at',
  'which',
  'what',
  'why',
  'how',
  'where',
  'does',
  'did',
  'do',
  'you',
  'your',
  'about',
  'into',
  'its',
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_]+/g) ?? []).filter(
    (term) => term.length > 1 && !STOP_WORDS.has(term),
  );
}

/** BM25-like term overlap over a single document; deterministic by design. */
export function lexicalScore(chunkText: string, query: string): number {
  const documentTerms = tokenize(chunkText);
  const queryTerms = new Set(tokenize(query));
  if (documentTerms.length === 0 || queryTerms.size === 0) {
    return 0;
  }
  const frequencies = new Map<string, number>();
  for (const term of documentTerms) {
    frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }
  const k1 = 1.5;
  const b = 0.75;
  const averageLength = documentTerms.length;
  const idf = Math.log(1 + (1 - 1 + 0.5) / (1 + 0.5));
  let score = 0;
  for (const term of queryTerms) {
    const frequency = frequencies.get(term);
    if (!frequency) {
      continue;
    }
    const denominator = frequency + k1 * (1 - b + (b * documentTerms.length) / averageLength);
    score += idf * ((frequency * (k1 + 1)) / denominator);
  }
  return score;
}

export interface RetrievalResult {
  chunk: LessonChunk;
  cosine: number;
  lexical: number;
  score: number;
}

/**
 * Hybrid ranking: 0.7 cosine + 0.3 normalized lexical when an embedding is
 * available, otherwise lexical-only with cosine 0. Sorting by score desc then
 * id asc makes the result stable for logging and tests.
 */
export function retrieveChunks(
  chunks: readonly LessonChunk[],
  query: string,
  queryEmbedding: readonly number[],
  limit = 4,
  minCosine = 0.7,
): RetrievalResult[] {
  const rawLexical = chunks.map((chunk) => lexicalScore(chunk.text, query));
  const maxLexical = Math.max(0, ...rawLexical);
  const results: RetrievalResult[] = [];

  chunks.forEach((chunk, index) => {
    const chunkEmbedding = chunk.embedding;
    const hasEmbedding =
      queryEmbedding.length > 0 && chunkEmbedding !== undefined && chunkEmbedding.length > 0;
    const similarity = hasEmbedding ? cosine(queryEmbedding, chunkEmbedding) : 0;
    const lexical = maxLexical > 0 ? rawLexical[index] / maxLexical : 0;

    if (hasEmbedding) {
      if (similarity < minCosine) {
        return;
      }
    } else if (rawLexical[index] <= 0) {
      return;
    }

    results.push({
      chunk,
      cosine: similarity,
      lexical,
      score: hasEmbedding ? 0.7 * similarity + 0.3 * lexical : lexical,
    });
  });

  return results
    .toSorted(
      (left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id),
    )
    .slice(0, limit);
}
