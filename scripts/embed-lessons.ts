/**
 * Usage: LLM_API_KEY=... pnpm exec node --experimental-strip-types scripts/embed-lessons.ts
 *
 * Reads the committed lesson MDX from disk, chunks it with the same splitter
 * the Worker uses, and writes one NDJSON record per chunk to stdout:
 *   {"id","lessonId","hotspotId","chunk","embedding"}
 * No database writes, no committed data file, and no keys are printed.
 */
import { readFileSync } from 'node:fs';
import { createLlmAdapter } from '../api/src/lib/llm.ts';
import { buildChunks, DEFAULT_HOTSPOTS } from '../api/src/lib/retrieval.ts';

async function main(): Promise<void> {
  const lessonId = 'heart';
  const mdx = readFileSync(new URL('../src/content/lessons/heart.mdx', import.meta.url), 'utf8');
  const chunks = buildChunks(mdx, lessonId, DEFAULT_HOTSPOTS);
  const env = {
    EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
  };
  const embeddings = await createLlmAdapter(env).embed(chunks.map((chunk) => chunk.text));

  chunks.forEach((chunk, index) => {
    process.stdout.write(
      `${JSON.stringify({
        chunk: chunk.text,
        embedding: embeddings[index],
        hotspotId: chunk.hotspotId,
        id: chunk.id,
        lessonId,
      })}\n`,
    );
  });
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
