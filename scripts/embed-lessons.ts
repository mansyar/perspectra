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
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { lesson, lessonEmbedding, schema } from '../api/src/db/schema.ts';
import type { LlmPort } from '../api/src/lib/llm.ts';
import { createLlmAdapter } from '../api/src/lib/llm.ts';
import { parseLessonContent } from '../api/src/lib/lesson-content.ts';
import { buildChunks } from '../api/src/lib/retrieval.ts';

const LESSON_DIR = new URL('../src/content/lessons/', import.meta.url);
const EMBEDDING_DIMENSIONS = 1536;

export interface IngestOptions {
  adapter: Pick<LlmPort, 'embed'>;
  db?: NeonDatabase<typeof schema> | null;
  lessonDir?: URL;
  stderr?: { write(value: string): unknown };
  stdout?: { write(value: string): unknown };
}

export interface IngestSummary {
  chunks: number;
  lessonId: string;
}

/** Re-runnable ingestion with injectable boundaries; no global environment reads. */
export async function ingestLessons({
  adapter,
  db = null,
  lessonDir = LESSON_DIR,
  stderr = process.stderr,
  stdout = process.stdout,
}: IngestOptions): Promise<IngestSummary[]> {
  const files = readdirSync(lessonDir)
    .filter((file) => file.endsWith('.mdx'))
    .toSorted();
  const summaries: IngestSummary[] = [];

  for (const file of files) {
    const lessonId = file.replace(/\.mdx$/, '');
    const mdx = readFileSync(new URL(file, lessonDir), 'utf8');
    const content = parseLessonContent(mdx, lessonId);
    const chunks = buildChunks(mdx, lessonId);
    const embeddings = await adapter.embed(
      chunks.map((chunk) => chunk.text),
      'document',
    );
    if (
      embeddings.length !== chunks.length ||
      embeddings.some(
        (embedding) =>
          embedding.length !== EMBEDDING_DIMENSIONS || !embedding.every(Number.isFinite),
      )
    ) {
      throw new Error(`Invalid ${lessonId} document embeddings`);
    }

    for (const [index, chunk] of chunks.entries()) {
      stdout.write(
        `${JSON.stringify({
          chunk: chunk.text,
          embedding: embeddings[index],
          hotspotId: chunk.hotspotId,
          id: chunk.id,
          lessonId,
        })}\n`,
      );
    }

    if (db !== null) {
      const lessonValues = {
        description: content.description,
        hotspots: content.hotspots,
        id: lessonId,
        title: content.title,
      };
      await db
        .insert(lesson)
        .values(lessonValues)
        .onConflictDoUpdate({
          set: {
            description: content.description,
            hotspots: content.hotspots,
            title: content.title,
          },
          target: lesson.id,
        });
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
      stderr.write(`Ingested ${lessonId}: ${chunks.length} chunks\n`);
    }
    summaries.push({ chunks: chunks.length, lessonId });
  }
  return summaries;
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const adapter = createLlmAdapter({
    EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
  });
  const db = write
    ? drizzle(new Pool({ connectionString: requireDatabaseUrl() }), { schema })
    : null;
  await ingestLessons({ adapter, db });
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for --write');
  }
  return url;
}

/** Importing the ingestion helpers must not connect to Gemini or Neon. */
function invokedDirectly(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
