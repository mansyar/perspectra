/**
 * Build-time generator for the retrieval chunk manifest.
 *
 * Usage: pnpm exec tsx scripts/generate-lesson-chunks.ts
 *
 * Reads every authored MDX lesson from the content collection directory and
 * rewrites api/src/data/lesson-chunks.ts. The Worker imports that generated
 * module instead of MDX, so no topic-specific prose or IDs live in code.
 * Re-run after any lesson edit; unit tests detect a stale manifest.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChunks, type LessonChunk } from '../api/src/lib/retrieval.ts';

const LESSON_DIR = new URL('../src/content/lessons/', import.meta.url);
const DATA_DIR = new URL('../api/src/data/', import.meta.url);
const OUTPUT_URL = new URL('../api/src/data/lesson-chunks.ts', import.meta.url);

function formatString(value: string): string {
  const quote = value.includes("'") ? '"' : "'";
  const escaped = value.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
  return `${quote}${escaped}${quote}`;
}

function formatKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : formatString(value);
}

function render(manifest: Readonly<Record<string, readonly LessonChunk[]>>): string {
  const entries = Object.keys(manifest)
    .toSorted()
    .map((lessonId) => {
      const chunks = manifest[lessonId].map((chunk) => {
        const fields = [
          `hotspotId: ${formatString(chunk.hotspotId)}`,
          `id: ${formatString(chunk.id)}`,
          `layer: ${formatString(chunk.layer)}`,
          `lessonId: ${formatString(chunk.lessonId)}`,
          `text: ${formatString(chunk.text)}`,
        ];
        return `    {\n${fields.map((field) => `      ${field},`).join('\n')}\n    },`;
      });
      return `  ${formatKey(lessonId)}: [\n${chunks.join('\n')}\n  ],`;
    });
  return [
    '/**',
    ' * GENERATED FILE — do not edit by hand.',
    ' * Regenerate with: pnpm exec tsx scripts/generate-lesson-chunks.ts',
    ' */',
    "import type { LessonChunk } from '../lib/retrieval';",
    '',
    'export const LESSON_CHUNKS: Readonly<Record<string, readonly LessonChunk[]>> = {',
    ...entries,
    '};',
    '',
  ].join('\n');
}

/** Rebuilds the committed manifest from the authored lesson MDX. */
export function generateLessonChunks(): string[] {
  const files = readdirSync(LESSON_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .toSorted();
  const manifest: Record<string, LessonChunk[]> = {};
  for (const file of files) {
    const lessonId = file.replace(/\.mdx$/, '');
    const mdx = readFileSync(new URL(file, LESSON_DIR), 'utf8');
    manifest[lessonId] = buildChunks(mdx, lessonId);
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUTPUT_URL, render(manifest), 'utf8');
  return Object.keys(manifest);
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  const lessonIds = generateLessonChunks();
  process.stdout.write(`Generated chunks for ${lessonIds.length} lessons\n`);
}
