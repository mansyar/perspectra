# Phase 2 Evidence — Gemini-Native Embeddings

- **Track:** `20261124-public-deployment` — Public deployment
- **Phase:** 2 — Gemini-Native Embeddings
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-public-deployment`
- **Base commit:** `aa8d74779f99b6a873504db0e49c7a7f5004d4bd`
- **Head commit:** `33a66706dba65cc154378be40202343ae261be9c`
- **Result:** passed

## Commands

| Layer | Command | Exit code | Result |
| --- | --- | --- | --- |
| Required phase gates | `pnpm verify:full` | 0 | Full verify chain, smoke suite, and Playwright suite passed after one permitted rerun of the known `oxfmt` exit-5-with-correct-output flake. |
| Adapter unit tests | `pnpm test tests/unit/llm.test.ts` | 0 | 18 tests passed. |
| Ingestion baseline (primary) | `pnpm test:integration tests/integration/embedding-ingestion.test.ts` | 1 | Expected red baseline before implementation: 1 passed, 2 contract tests failed. |
| Format check | `pnpm fmt:check` | 0 | All 91 matched files used the expected format. |

`pnpm verify:full` executed `pnpm verify && pnpm smoke && pnpm test:e2e` with these results:

| Gate | Result |
| --- | --- |
| Lint | Passed with six pre-existing warnings in `src/lib/offline-queue.ts` and `tests/integration/glb-manifest.test.ts`. |
| Format | Passed; `oxfmt --check .` reported correct formatting for 91 files. |
| Typecheck | Passed; Astro content/types sync and `tsc --noEmit` succeeded. |
| Unit | Passed; 17 files and 151 tests. |
| Coverage | Passed; 98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines. |
| Integration | Passed; 6 files and 40 tests, including the new Gemini ingestion source contract. |
| Build | Passed; Astro built 3 pages. The existing large-chunk warning remains non-blocking. |
| Smoke | Passed; 1 Chromium smoke test. |
| Playwright | Passed; 17 tests, including accessibility and performance. Lighthouse accessibility/performance/seo were 1 for the catalog and 1/0.98/1 for the heart lesson; best practices was 0.96 for both. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 | Chat and embeddings use Gemini through the shared adapter. | `api/src/lib/llm.ts` removes both OpenAI branches; chat retains Gemini `generateContent` with `gemini-2.5-flash` as the default. | Met |
| FR-4 | Gemini batch embeddings are deterministic, 1536-dimensional, and normalized for the existing vector schema. | The adapter uses `gemini-embedding-2:batchEmbedContents`, task prefixes, strict row/dimension/finite/zero-norm validation, and scaled unit-L2 normalization. | Met |
| FR-5 | Lesson ingestion generates Gemini document embeddings and retains NDJSON/database upserts. | `scripts/embed-lessons.ts` passes explicit `document` purpose; the integration contract verifies NDJSON and upsert behavior. | Met locally |
| NFR-4 | Gemini and OpenAI embedding spaces cannot be mixed. | Unsupported providers/models fail fast; the adapter contains no OpenAI request path. | Met |
| AC-3 | Focused tests prove request shape, ordering, normalization, validation failures, Gemini chat, and ingestion purpose. | 18 adapter unit tests and 3 ingestion source-contract tests pass inside the full suites. | Met |
| AC-4 | A fresh Neon production branch contains the heart lesson, six hotspots, and valid Gemini embeddings. | Requires production credentials, deployment, and database ingest. | Pending Phase 4 |

## Evidence paths

- `api/src/env.ts`
- `api/src/lib/llm.ts`
- `scripts/embed-lessons.ts`
- `README.md`
- `tests/unit/llm.test.ts`
- `tests/integration/embedding-ingestion.test.ts`
- `conductor/tracks/20261124-public-deployment/verification/phase-2.md`

## Deviations

None. No schema, migration, dependency, lockfile, workspace, or coverage configuration changed.

## Human-only exceptions

Production Neon credentials and the production ingest remain Phase 4 work. No human-only exception was needed for local implementation or verification.

## Notes

All adapter tests use a local fetch stub; no real network or credentials were used. The primary-run red baseline is closed. A post-implementation targeted integration invocation was permission denied, but the designated `pnpm verify:full` command ran the complete integration suite successfully, so no verification gap remains. Legacy OpenAI wording in deployment documentation and `conductor/tech-stack.md` was intentionally left for its owning phase.

## Primary verification

| Check | Result |
| --- | --- |
| Working tree before verification | Clean |
| Phase diff `aa8d74779f99b6a873504db0e49c7a7f5004d4bd..HEAD` | Only declared Phase 2 files and evidence |
| `pnpm verify:full` | Exit 0 |
| Lint | 6 pre-existing warnings, 0 errors |
| Format | 91 files clean |
| Typecheck | Passed |
| Unit | 17 files / 151 tests passed |
| Coverage | 98.61% statements / 92.41% branches / 97.84% functions / 99.12% lines |
| Integration | 6 files / 40 tests passed |
| Build | 3 static pages |
| Smoke | 1 passed |
| Playwright | 17 passed |
| Lighthouse | Catalog `1.00/1.00/0.96/1.00`; lesson `0.98/1.00/0.96/1.00` |

Source audit confirms `api/src/lib/llm.ts` contains only Gemini endpoints, validates `gemini-embedding-2` and 1536 dimensions, normalizes every vector, and `scripts/embed-lessons.ts` passes explicit `document` purpose. No production OpenAI request path remains. Result: **VERIFIED**.
