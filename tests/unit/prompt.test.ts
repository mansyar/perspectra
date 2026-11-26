import { describe, expect, it } from 'vitest';
import {
  assemblePrompt,
  citationScope,
  CITATION_PATTERN,
  stripCitations,
  validateCitations,
} from '../../api/src/lib/prompt';
import type { RetrievalResult } from '../../api/src/lib/retrieval';
import { EARTH_LESSON } from '../fixtures/lessons';

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

  it('keeps tutor instructions topic-neutral for Earth', () => {
    const earthChunk: RetrievalResult = {
      chunk: {
        hotspotId: 'outer_core',
        id: 'earth-interior:outer_core:overview',
        layer: 'overview',
        lessonId: EARTH_LESSON.id,
        text: 'The outer core is liquid iron and nickel.',
      },
      cosine: 0.9,
      lexical: 0.4,
      score: 0.75,
    };
    const earthPrompt = assemblePrompt({
      activeHotspot: 'outer_core',
      chunks: [earthChunk],
      history: [],
      lessonTitle: EARTH_LESSON.title,
      question: 'What is the outer core made of?',
    });
    expect(earthPrompt).toContain(EARTH_LESSON.title);
    expect(earthPrompt).toContain('earth-interior:outer_core:overview');
    expect(earthPrompt).not.toMatch(/anatomy|clinical|medical advice/i);
  });

  it('never embeds key names', () => {
    expect(prompt).not.toMatch(/API_KEY|SECRET|TOKEN/i);
  });

  it('handles tutor turns, no hotspot and empty sources/history', () => {
    const empty = assemblePrompt({
      activeHotspot: null,
      chunks: [],
      history: [{ content: 'Earlier answer', role: 'assistant' }],
      lessonTitle: 'The Human Heart',
      question: 'Anything else?',
    });
    expect(empty).toContain('Tutor: Earlier answer');
    expect(empty).toContain('Active hotspot: none selected');
    expect(empty).toContain('Allowed chunk IDs: ');
    expect(empty).toContain('(no chunks supplied)');
    const noHistory = assemblePrompt({
      activeHotspot: 'aorta',
      chunks: [result],
      history: [],
      lessonTitle: 'The Human Heart',
      question: 'What next?',
    });
    expect(noHistory).toContain('CONVERSATION SO FAR\n(none)');
  });
});

describe('citationScope', () => {
  const crossHotspotId = 'heart:mitral_valve:overview';

  it('derives the prompt allowlist and the validation set from one scoped result', () => {
    const scoped = [result];
    const allowedIds = citationScope(scoped);
    const scopedPrompt = assemblePrompt({
      activeHotspot: 'aorta',
      chunks: scoped,
      history: [],
      lessonTitle: 'The Human Heart',
      question: 'What does the aorta do?',
    });
    const crossAnswer = `Blood flows [[${crossHotspotId}]].`;

    expect(scopedPrompt).toContain(`Allowed chunk IDs: ${[...allowedIds].join(', ')}`);
    expect(scopedPrompt).not.toContain(crossHotspotId);
    expect(validateCitations(crossAnswer, allowedIds)).toMatchObject({
      reason: 'unknown_citation',
      valid: false,
    });
  });

  it('accepts a citation from the scoped result only', () => {
    const answer = 'Blood flows [[heart:aorta:overview]].';
    expect(validateCitations(answer, citationScope([result]))).toMatchObject({ valid: true });
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
