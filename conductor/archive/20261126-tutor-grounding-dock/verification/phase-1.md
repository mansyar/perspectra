# Phase 1 Verification — Generic lesson chunk source

- Track: `20261126-tutor-grounding-dock` (Implement a sticky tutor dock with reliable hotspot-grounded answers)
- Phase: 1 — Generic lesson chunk source
- Date: 2026-11-26
- Branch: `feat/20261126-tutor-grounding-dock`
- Base commit: `ba10541dd0864b9cd40689e1e2a22602801c2d39`
- Head commit at verification: `2406ea5` (`test(retrieval): cover every authored lesson with content-derived chunks`)
- Result: verified

## Commands

Verification command, run exactly as specified:

`pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Lint | `pnpm lint` | 0 | `oxlint .` found no errors. Six pre-existing warnings only: one `no-shadow` in `tests/integration/worker-assets.test.ts` and five `unicorn/prefer-add-event-listener` in `src/lib/offline-queue.ts`. No warnings in files touched by this phase. |
| Format | `pnpm fmt:check` | 0 | `oxfmt --check .`: "All matched files use the correct format." (113 files). The known exit-5 flake did not occur. |
| Types | `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` completed with no diagnostics. |
| Build | `pnpm build` | 0 | `astro build` completed; static routes include `/`, `/sign-in`, `/verify`, `/lessons/heart`, `/lessons/earth-interior`. Only the pre-existing >500 kB chunk-size warning. |
| Unit tests | `pnpm test` | 0 | Vitest 5.1.1: 22 test files passed, 216 tests passed. |
| Coverage | `pnpm coverage` | 0 | 22 files / 216 tests passed. Statements 98.65% (366/371), branches 92.95% (198/213), functions 97.91% (94/96), lines 99.14% (347/350). `api/src/lib/retrieval.ts`: 100% statements, 96.22% branches, 100% functions, 100% lines — per-file thresholds met. |
| Integration | `pnpm test:integration` | 0 | Vitest integration config: 7 test files passed, 66 tests passed. |

The chain was run twice: first before a small lint-hygiene cleanup in the new test (renaming callback parameters that shadowed the existing `chunk` helper), and again after that cleanup. Both runs passed end to end; the second run is the evidence above and removed the only new warnings.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-7 | Chunks come from authored lesson MDX for every lesson, with hotspot IDs and text supplied by content, not topic-specific code. | `scripts/generate-lesson-chunks.ts` enumerates `src/content/lessons/*.mdx` and calls `buildChunks(mdx, lessonId)`; `api/src/data/lesson-chunks.ts` contains the generated 36 chunks (18 per authored lesson). `api/src/lib/retrieval.ts` loads by `lessonId` from that manifest; no topic identifiers are used in the code path. | Verified |
| NFR-6 | No `heart`/`earth` or topic identifiers in code paths; content supplies them. | Lesson IDs, hotspot IDs, layer names and prose in the manifest are all derived from MDX by the generator. `loadLessonChunks` accepts an arbitrary `lessonId` key and returns `[]` for unknown IDs. Legacy `HEART_LESSON_MDX`/`DEFAULT_HOTSPOTS` exports are unchanged and remain outside this chunk-source path (see notes). | Verified |
| AC-7 | Unit: chunk source returns non-empty chunks for each authored lesson, IDs derived from MDX, no topic constants. | `tests/unit/retrieval.test.ts` enumerates every authored MDX file at test time, derives expected chunks with `buildChunks`, and asserts non-empty results plus exact `id`/`text` equality, `id === lessonId:hotspotId:layer`, non-empty bounded text, hotspot filtering, and `[]` for an unknown lesson. Passed in the 22/216 unit run. | Verified |

## Evidence paths

- `scripts/generate-lesson-chunks.ts` — build-time generator (`generateLessonChunks()`, injectable-free CLI entry point).
- `api/src/data/lesson-chunks.ts` — generated, committed lesson→chunk manifest (36 chunks keyed by lesson ID).
- `api/src/lib/retrieval.ts` — generic `loadLessonChunks(lessonId, hotspots?)` backed by the manifest.
- `tests/unit/retrieval.test.ts` — topic-agnostic chunk-source tests.
- Command output for the final verification run was captured by the harness shell (layers and counts quoted above).

## Deviations

None. All changes are confined to the phase Touches.

## Notes

- The generator reads the MDX collection and regenerates the manifest; invocation is `pnpm exec tsx scripts/generate-lesson-chunks.ts`. No `package.json` script was added because `package.json` is outside this phase's Touches.
- The manifest is generated but committed as a source-of-truth artifact so the API can import it without a build step; rerun the generator after editing authored MDX.
- `loadLessonChunks` keeps returning a mutable `LessonChunk[]` and its two-argument signature so `api/src/lib/prompt.ts`, `api/src/routes/tutor.ts` and the `ChunkSource` contract remain unchanged for Phase 2.
- `HEART_LESSON_MDX` and `DEFAULT_HOTSPOTS` remain exported from `api/src/lib/retrieval.ts` as legacy fallbacks used by `api/src/routes/quiz.ts`, `api/src/lib/mastery.ts` and existing tests. Removing them would require edits outside Touches and is left for a later phase; they are not used by the generic chunk loader.
- The generated manifest deliberately quotes strings containing ASCII apostrophes with double quotes so `oxfmt` check stays clean under the repository's single-quote default.
- Code commits: `c5cd8e7` (P1.T1), `2406ea5` (P1.T2). This evidence file is committed separately and does not change the verified code state.

## Primary verification

- Date: 2026-11-26
- Command: `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`
- First attempt: exit 1 — `oxfmt --check .` printed "All matched files use the correct format." for 113 files, then `oxfmt` exited 5 (known flake). No formatting changes were made.
- Second attempt: exit 0 — lint reported only five pre-existing warnings in `src/lib/offline-queue.ts` and one in `tests/integration/worker-assets.test.ts`; format, typecheck and build clean; 22 unit files / 216 tests passed; coverage gate met (retrieval.ts 100% lines); 7 integration files / 66 tests passed.
- Working tree after subagent commits: clean.
- `git diff --name-only ba10541..HEAD`: `api/src/data/lesson-chunks.ts`, `api/src/lib/retrieval.ts`, `conductor/tracks/20261126-tutor-grounding-dock/verification/phase-1.md`, `scripts/generate-lesson-chunks.ts`, `tests/unit/retrieval.test.ts` — all within Phase 1 Touches; no unreported files.
- Acceptance criteria AC-1 through AC-9 not owned by this phase (AC-7 checked above); AC-7 satisfied by unit tests enumerating every authored MDX file.
- Result: verified. Task commits retained rather than squashed because the active goal forbids reset; no merge, user, or unreported commit was present in the range.
