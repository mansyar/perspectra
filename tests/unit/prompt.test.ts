import { describe, expect, it } from 'vitest';
import {
  assemblePrompt,
  CITATION_PATTERN,
  stripCitations,
  validateCitations,
} from '../../api/src/lib/prompt';
import type { RetrievalResult } from '../../api/src/lib/retrieval';

const result: RetrievalResult = {
  chunk: {
    hotspotId: 'aorta',
    id: 'heart:aorta:overview',
    layer: 'overview',
    lessonId: 'heart',
    text: 'The aorta carries oxygenated blood.',
  },
  cosine: 0.9,
  lexical: 0.4,
  score: 0.75,
};

describe('assemblePrompt', () => {
  const prompt = assemblePrompt({
    activeHotspot: 'aorta',
    chunks: [result],
    history: [{ content: 'Hello', role: 'user' }],
    lessonTitle: 'The Human Heart',
    question: 'What does the aorta do?',
  });

  it('contains all four explicit layers', () => {
    expect(prompt).toContain('GLOBAL CONTEXT');
    expect(prompt).toContain('INSTRUCTIONAL RULES');
    expect(prompt).toContain('ADAPTIVE VARIABLES');
    expect(prompt).toContain('POST-INTERACTION CONTRACT');
  });

  it('locks scope to the supplied chunks and cites every claim', () => {
    expect(prompt).toContain('heart:aorta:overview');
    expect(prompt).toContain('Cite every factual claim');
    expect(prompt).toContain('say you do not know');
    expect(prompt).toContain('Active hotspot: aorta');
    expect(prompt).toContain('What does the aorta do?');
  });

  it('never embeds key names', () => {
    expect(prompt).not.toMatch(/API_KEY|SECRET|TOKEN/i);
  });
});

describe('validateCitations', () => {
  const allowed = new Set(['heart:aorta:overview']);

  it('requires at least one citation', () => {
    expect(validateCitations('The aorta carries blood.', allowed)).toMatchObject({
      reason: 'missing_citation',
      valid: false,
    });
  });

  it('rejects unknown chunk IDs', () => {
    expect(validateCitations('Blood flows [[heart:unknown:overview]].', allowed)).toMatchObject({
      reason: 'unknown_citation',
      valid: false,
    });
  });

  it('accepts known citations and extracts them', () => {
    expect(validateCitations('Blood flows [[heart:aorta:overview]].', allowed)).toEqual({
      citations: ['heart:aorta:overview'],
      valid: true,
    });
  });

  it('matches the documented citation syntax', () => {
    expect('[[heart:aorta:overview]]'.match(CITATION_PATTERN)).toEqual([
      '[[heart:aorta:overview]]',
    ]);
  });
});

describe('stripCitations', () => {
  it('removes markers for the static excerpt', () => {
    expect(stripCitations('The aorta [[heart:aorta:overview]] carries blood.')).toBe(
      'The aorta carries blood.',
    );
  });
});
