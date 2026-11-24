import { describe, expect, it } from 'vitest';
import { classifyIntent } from '../../api/src/lib/intent';

const lessonTerms = ['heart', 'aorta', 'left ventricle'];

describe('classifyIntent', () => {
  it('accepts lesson terms case-insensitively', () => {
    expect(classifyIntent('What does the AORTA do?', lessonTerms)).toBe('lesson');
  });

  it('accepts generic learning words without a lesson term', () => {
    expect(classifyIntent('Explain it please', lessonTerms)).toBe('lesson');
  });

  it('rejects unrelated questions with no lesson or generic term', () => {
    expect(classifyIntent('Tell me a joke', lessonTerms)).toBe('off_topic');
  });

  it('rejects an empty question', () => {
    expect(classifyIntent('', lessonTerms)).toBe('off_topic');
  });

  it('accepts a non-heart lesson term without generic learning words', () => {
    expect(classifyIntent('cortex signals', ['brain', 'cortex', 'signals'])).toBe('lesson');
  });
});
