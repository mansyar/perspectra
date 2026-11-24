/**
 * Usage (Gemini only):
 *   LLM_PROVIDER=gemini EMBEDDING_MODEL=gemini-embedding-2 LLM_API_KEY=... \
 *     pnpm exec node --experimental-strip-types scripts/embed-lessons.ts
 *   DATABASE_URL=... LLM_PROVIDER=gemini EMBEDDING_MODEL=gemini-embedding-2 LLM_API_KEY=... \
 *     pnpm exec node --experimental-strip-types scripts/embed-lessons.ts --write
 * EMBEDDING_API_KEY may override LLM_API_KEY for embeddings.
 *
 * Discovers every MDX lesson, chunks it with the same splitter the Worker uses,
 * and writes one NDJSON record per chunk to stdout:
 *   {"id","lessonId","hotspotId","chunk","embedding"}
 * With --write, rows are also upserted into `lesson` and `lesson_embedding`.
 * No keys are printed and no data file is committed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { lesson, lessonEmbedding, schema } from '../api/src/db/schema.ts';
import { createLlmAdapter } from '../api/src/lib/llm.ts';
import { buildChunks } from '../api/src/lib/retrieval.ts';

const LESSON_DIR = new URL('../src/content/lessons/', import.meta.url);

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const files = readdirSync(LESSON_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .toSorted();
  const env = {
    EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
  };
  const adapter = createLlmAdapter(env);
  const db = write
    ? drizzle(new Pool({ connectionString: requireDatabaseUrl() }), { schema })
    : null;

  for (const file of files) {
    const lessonId = file.replace(/\.mdx$/, '');
    const mdx = readFileSync(new URL(file, LESSON_DIR), 'utf8');
    const chunks = buildChunks(mdx, lessonId);
    if (chunks.length === 0) {
      continue;
    }
    const embeddings = await adapter.embed(
      chunks.map((chunk) => chunk.text),
      'document',
    );
    const hotspots = [...new Set(chunks.map((chunk) => chunk.hotspotId))];
    const title = /^title:\s*["']?([^"'\r\n]+)/m.exec(mdx)?.[1]?.trim() ?? lessonId;

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

    if (db !== null) {
      await db
        .insert(lesson)
        .values({ hotspots, id: lessonId, title })
        .onConflictDoUpdate({ set: { hotspots, title }, target: lesson.id });
      for (const [index, chunk] of chunks.entries()) {
        const embedding = embeddings[index];
        await db
          .insert(lessonEmbedding)
          .values({
            chunk: chunk.text,
            embedding,
            hotspotId: chunk.hotspotId,
            id: chunk.id,
            lessonId,
          })
          .onConflictDoUpdate({
            set: { chunk: chunk.text, embedding, hotspotId: chunk.hotspotId },
            target: lessonEmbedding.id,
          });
      }
      process.stderr.write(`Ingested ${lessonId}: ${chunks.length} chunks\n`);
    }
  }
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for --write');
  }
  return url;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
