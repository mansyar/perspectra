export type Intent = 'lesson' | 'off_topic';

const GENERIC_LEARNING_TERMS = [
  'what',
  'why',
  'how',
  'explain',
  'difference',
  'function',
  'role',
  'where',
] as const;

/**
 * Cheap front-door router, not a classifier: it only decides whether a
 * question is even about the lesson before we pay for retrieval or generation.
 * Normalizes to lowercase and accepts a match on any lesson term (hotspot
 * names, lesson ID) or generic learning word. False positives are cheap; the
 * real grounding gate is citation validation later in the pipeline.
 */
export function classifyIntent(question: string, lessonTerms: readonly string[]): Intent {
  const normalized = question.toLowerCase();
  const terms = [...lessonTerms, ...GENERIC_LEARNING_TERMS];
  return terms.some((term) => {
    const needle = term.toLowerCase().trim();
    return needle.length > 0 && normalized.includes(needle);
  })
    ? 'lesson'
    : 'off_topic';
}
