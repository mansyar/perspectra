/** Shared Lighthouse thresholds and assertions for the @perf Playwright spec. */
export const CATEGORY_THRESHOLDS = Object.freeze({
  accessibility: 0.95,
  'best-practices': 0.9,
  performance: 0.95,
  seo: 0.9,
});

export const LIGHTHOUSE_FLAGS = Object.freeze({
  logLevel: 'error',
  onlyCategories: Object.keys(CATEGORY_THRESHOLDS),
  output: 'json',
});

/** The catalog is deliberately static: it ships no JavaScript at all. */
export const CATALOG_JS_BYTE_BUDGET = 0;

export function categoryScores(result) {
  const scores = {};
  for (const key of Object.keys(CATEGORY_THRESHOLDS)) {
    scores[key] = result?.lhr?.categories?.[key]?.score ?? null;
  }
  return scores;
}

export function assertCategoryScores(result, label) {
  const scores = categoryScores(result);
  const failures = Object.entries(CATEGORY_THRESHOLDS)
    .filter(([key, minimum]) => scores[key] === null || scores[key] < minimum)
    .map(([key, minimum]) => `${key}=${scores[key]} (need >= ${minimum})`);
  if (failures.length > 0) {
    const audits = result?.lhr?.audits ?? {};
    const metrics = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'speed-index',
    ]
      .map((key) => `${key}=${audits[key]?.displayValue ?? audits[key]?.numericValue ?? 'n/a'}`)
      .join(', ');
    throw new Error(`Lighthouse budgets failed for ${label}: ${failures.join(', ')}. ${metrics}`);
  }
  return scores;
}

export function assertStaticCatalog(html) {
  if (/<script\b/i.test(html)) {
    throw new Error('The catalog must not contain a <script> tag.');
  }
  return true;
}

export function assertCatalogJsBudget(bytes) {
  if (bytes > CATALOG_JS_BYTE_BUDGET) {
    throw new Error(`Catalog JS budget exceeded: ${bytes} > ${CATALOG_JS_BYTE_BUDGET} bytes.`);
  }
  return true;
}
