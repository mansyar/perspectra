import type { RetrievalResult } from './retrieval';

export interface PromptInput {
  lessonTitle: string;
  activeHotspot: string | null;
  chunks: readonly RetrievalResult[];
  history: readonly { role: 'user' | 'assistant'; content: string }[];
  question: string;
}

/**
 * Scope-locked, layered prompt. Every layer is explicit so it can be reviewed
 * independently; no keys, URLs or credentials are ever part of the prompt.
 */
export function assemblePrompt(input: PromptInput): string {
  const sources = input.chunks
    .map(
      (result) =>
        `- [[${result.chunk.id}]] (${result.chunk.hotspotId}/${result.chunk.layer}): ${result.chunk.text}`,
    )
    .join('\n');

  const history = input.history
    .map((turn) => `${turn.role === 'user' ? 'Learner' : 'Tutor'}: ${turn.content}`)
    .join('\n');

  return [
    'GLOBAL CONTEXT',
    `Lesson: ${input.lessonTitle}`,
    'You are a course-grounded tutor. Answer only from the source chunks below.',
    '',
    'INSTRUCTIONAL RULES',
    'Cite every factual claim using the exact [[chunk-id]] marker of the chunk it came from.',
    'Stay within the supplied chunks. If the chunks do not answer the question, say you do not know.',
    'Never invent anatomy, clinical claims, or citations that are not in the source list.',
    '',
    'ADAPTIVE VARIABLES',
    `Active hotspot: ${input.activeHotspot ?? 'none selected'}`,
    'Mastery: not yet modelled (placeholder for the mastery layer)',
    `Allowed chunk IDs: ${input.chunks.map((result) => result.chunk.id).join(', ')}`,
    '',
    'POST-INTERACTION CONTRACT',
    'Keep the answer under 200 words and end after the cited explanation.',
    'Do not offer medical advice; point to the clinical layer of the prose where relevant.',
    '',
    'SOURCE CHUNKS',
    sources || '(no chunks supplied)',
    '',
    'CONVERSATION SO FAR',
    history || '(none)',
    '',
    `LEARNER QUESTION: ${input.question}`,
  ].join('\n');
}

export const CITATION_PATTERN = /\[\[([a-zA-Z0-9:_-]+)\]\]/g;

export interface CitationValidation {
  valid: boolean;
  citations: string[];
  reason?: string;
}

/** Worker-side gate: at least one citation and no unknown chunk IDs. */
export function validateCitations(
  answer: string,
  allowedIds: ReadonlySet<string>,
): CitationValidation {
  const citations = Array.from(answer.matchAll(CITATION_PATTERN), (match) => match[1]);
  if (citations.length === 0) {
    return { valid: false, citations, reason: 'missing_citation' };
  }
  if (citations.some((id) => !allowedIds.has(id))) {
    return { valid: false, citations, reason: 'unknown_citation' };
  }
  return { valid: true, citations };
}

/** Removes citation markers for the static fallback excerpt. */
export function stripCitations(answer: string): string {
  return answer.replace(CITATION_PATTERN, '').replace(/\s+/g, ' ').trim();
}
