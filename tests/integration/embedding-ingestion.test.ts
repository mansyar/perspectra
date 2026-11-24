import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ingestionSource = readFileSync(
  new URL('../../scripts/embed-lessons.ts', import.meta.url),
  'utf8',
);
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

describe('Gemini lesson ingestion contract', () => {
  it('embeds lesson chunks explicitly as documents', () => {
    expect(ingestionSource).toMatch(
      /adapter\.embed\(\s*chunks\.map\(\(chunk\) => chunk\.text\),\s*'document',?\s*\)/,
    );
  });

  it('retains NDJSON output and database upserts', () => {
    expect(ingestionSource).toContain('process.stdout.write(');
    expect(ingestionSource).toContain('.insert(lessonEmbedding)');
    expect(ingestionSource).toContain('.onConflictDoUpdate(');
  });

  it('documents Gemini-only embedding configuration and commands', () => {
    expect(readme).toContain('gemini-embedding-2');
    expect(readme).toContain('batchEmbedContents');
    expect(readme).toContain('LLM_API_KEY=<your-key>');
    expect(readme).not.toMatch(/OpenAI-compatible|api\.openai\.com|\/v1\/embeddings/i);
  });
});
