# Review Fix Round 2 Verification

- Track: `20261124-showcase-mvp`
- Phase: R2
- Date: 2026-11-24
- Branch: `feat/20261124-showcase-mvp`
- Base: `3f3bcbe42cdc6dc6834118ac0482c06fe4f5bcd7`
- Code head: `b05afe4`
- Result: **VERIFIED**

Goal: remove the production second-lesson retrieval filter and remaining heart-only vocabulary so the topic-agnostic claim holds in the real Worker path.

## Findings

| ID | Severity | Finding | Fix | Regression test | Status |
| --- | --- | --- | --- | --- | --- |
| N1 | High | Production `resolve()` filtered DB-backed lesson chunks through `DEFAULT_HOTSPOTS`, so second-lesson chunks were discarded and the tutor returned `no_context`. Tutor also passed the heart allowlist explicitly. | `productionChunks` now returns repository chunks unfiltered (the repository already scopes by `lessonId`); the heart allowlist remains only for the local MDX fallback, and tutor calls the chunk source without it. Added an injectable `LessonChunkRepository` port for production-path testing. | `tests/integration/tutor.test.ts` — "serves a second lesson through the production chunk repository path" uses `createApp` with no injected `getChunks` and a fake repository returning `brain:cortex:overview`; asserts a grounded `done` event instead of `no_context`. | Fixed |
| N2 | Medium | Tutor intent terms, quiz/mastery vocabulary, and badge issuance still used heart-only IDs and wording. | Tutor derives intent terms from `lessonId`, chunk hotspot IDs, and distinctive text tokens; generic learning words stay in `classifyIntent`. Added `hotspotIdsFromChunks` in `retrieval.ts`. Quiz and badge derive hotspot sets from `getChunks?.(lessonId)`, falling back to `DEFAULT_HOTSPOTS` only with no source/chunks. Quiz `/mastery` accepts `?lessonId=`, grade uses the stored lesson ID, and `recommendNext` takes an explicit hotspot order. Badge `/issue` accepts an optional `lessonId` (default `heart`) and sets the credential envelope lesson. Prompt wording is topic-agnostic and lists actual hotspot IDs. | `tests/integration/tutor.test.ts` non-heart question without generic words; `tests/unit/retrieval.test.ts` vocabulary helper; `tests/unit/intent.test.ts` non-heart term; `tests/unit/mastery.test.ts` custom hotspot order; `tests/unit/quiz.test.ts` non-heart mastery route; `tests/integration/badge.test.ts` non-heart issuance and failing-ID report. | Fixed |

## Verification

Exact command: `pnpm verify:full` — final exit code **0**.

| Stage | Result |
| --- | --- |
| `pnpm lint` | Exit 0; 6 pre-existing warnings only (four IndexedDB `on*` handlers in `src/lib/offline-queue.ts`, two `Array#sort` calls in `tests/integration/glb-manifest.test.ts`). |
| `pnpm fmt:check` | Exit 0; 83 files correctly formatted. Intermittent oxfmt exit 5 with "All matched files use the correct format" was observed twice and rerun as allowed. |
| `pnpm typecheck` | Exit 0. |
| `pnpm test` | 13 files / 103 unit tests passed. |
| `pnpm coverage` | 13 files / 103 tests; 98.6% statements, 91.7% branches, 97.84% functions, 99.11% lines on the unchanged 11-module include list with per-file 80% gates. |
| `pnpm test:integration` | 5 files / 37 integration tests passed. |
| `pnpm build` | 3 static pages built; existing large-chunk warning only. |
| `pnpm smoke` | 1 passed. |
| `pnpm test:e2e` | 17 passed, including `@a11y`, `@perf`, `@learning-loop`, `@tutor`, and all scene step-down tests. |

Lighthouse logs from the passing run:

- `/`: `{"accessibility":1,"best-practices":0.96,"performance":1,"seo":1}`
- `/lessons/heart/`: `{"accessibility":1,"best-practices":0.96,"performance":0.95,"seo":1}`

An earlier E2E run exposed a click-before-hydration race in the scene hotspot buttons under parallel load. Added a `data-scene-hydrated` signal to `SceneIsland` and an `openLesson` helper that waits for it in `tests/e2e/scene.spec.ts`; assertions were not weakened. A separate Lighthouse run measured lesson performance 0.94 (below the 0.95 gate) under parallel contention; the final passing rerun measured 0.95, exactly at the gate. No threshold was lowered.

## Deviations

- Added `chunkRepository?: LessonChunkRepository` to `AppDeps` so the production chunk path can be tested with an injected fake repository while still leaving `getChunks` uninjected.
- When a chunk source exists but returns no chunks, quiz and badge fall back to `DEFAULT_HOTSPOTS` and the heart mirror; this preserves direct/dev callers without a lesson index.
- `api/src/lib/badge.ts` remains outside R2 Touches, so its human-readable achievement narrative still mentions "heart landmark". The credential's lesson ID, mastery vocabulary, and verification are now lesson-correct. Recommend a follow-up to generalize that narrative.
- `data-scene-hydrated` was added to the scene island solely as an E2E hydration signal, matching the existing tutor and quiz hydration markers.

## Human-only exceptions

- Primary browser visual re-check of the interactive heart on WebGPU and WebGL hardware.
- Real Neon ingestion via `scripts/embed-lessons.ts --write` and real OAuth/LLM credentials were not exercised; injected fakes only.

## Blockers

None.

## Commits

| SHA | Message |
| --- | --- |
| `b05afe4` | fix(topics): remove heart-only retrieval and mastery vocabulary |

## Primary verification

Primary re-ran the exact chain on current HEAD with status clean first:

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify:full` | 0 | lint 6 warnings/0 errors; fmt:check 83 files; typecheck clean; 103 unit tests; 37 integration tests; coverage 98.6% statements / 91.7% branches / 97.84% functions / 99.11% lines with per-file 80% gates; 3-page build; 1 smoke; 17 E2E |
| Lighthouse `/` | — | 1.00 / 1.00 / 0.96 / 1.00 (performance / accessibility / BP / SEO) |
| Lighthouse `/lessons/heart/` | — | 0.95 / 1.00 / 0.96 / 1.00 |

Diff `3f3bcbe..HEAD` contained only the allowed source/test files plus evidence, with one benign extra: `src/components/scene/SceneIsland.tsx` gained `data-scene-hydrated` as an E2E hydration signal. Primary browser pass after this backend-only round is recorded in `verification/browser.md` and passed.

Human-only exceptions remain real Neon ingest, OAuth/LLM credentials and physical WebGPU hardware; forced WebGL fallback was already verified in round 1.
