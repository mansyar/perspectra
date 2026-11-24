# Review Fix Round 1 — Verification Evidence

- **Track:** `20261124-showcase-mvp`
- **Phase:** Review-fix round 1 (F1–F5)
- **Date:** 2026-11-24
- **Branch:** `feat/20261124-showcase-mvp`
- **Base checkpoint:** `3801330` (conductor review-fix phase commit)
- **Code head:** `befd0ea` (hydration-gating fix; evidence commit follows)
- **Result:** VERIFIED

## Goal

Resolve review findings F1–F5 from `conductor/tracks/20261124-showcase-mvp/review.md` and make verification evidence truthful, without weakening any existing test or changing dependencies.

## Findings fixed

| Finding | Location | Fix applied | Test added | Status |
| --- | --- | --- | --- | --- |
| F1 (High) — renderer step-down never remounts | `src/components/scene/SceneIsland.tsx:83` (`stepDown`), `:95` (`usePoster`), `:130` (keyed boundary), `:146` (status) | Boundary now uses `key={`${tier}:${attempt}`}`; `stepDown()` resets `ready`, increments `attempt`, changes tier and writes a visible `role="status"` notice with a poster-retry button. `webgpu→webgl→poster` is now a real remount ladder. | `tests/e2e/scene.spec.ts:114` forced WebGPU failure steps to WebGL with mounted canvas; `:125` second failure steps to poster and keeps prose visible. | fixed |
| F4 (Medium) — poster hidden before GLB loads | `src/components/scene/HeartScene.tsx:97` (`SceneReady`), `:229` | Readiness is signalled from `SceneReady` inside the loaded `SceneContents`, after `useGLTF` resolves; `Canvas onCreated` is no longer the ready signal. The GET probe in `SceneIsland.tsx:52–81` only selects a fallback tier. | `tests/e2e/scene.spec.ts:136` delays `**/*.glb` and asserts the poster stays visible until `data-scene-ready="true"` and a canvas appears. | fixed |
| F2 (High) — no runtime pgvector retrieval; hardcoded MDX mirror | `api/src/lib/lesson-chunk-repository.ts:7`, `:11`, `:32`; `api/src/index.ts:9`, `:64–74`, `:86–95`; `api/src/routes/quiz.ts:16`, `:70`, `:83`, `:151–153`; `api/src/lib/retrieval.ts:153`; `scripts/embed-lessons.ts:22–41`, `:61–82` | Added `LessonChunkRepository` port plus Drizzle implementation reading `lesson_embedding` with array/JSON/numeric-string embedding parsing. Production `getChunks` uses it when `DATABASE_URL` is set, with a clearly labelled local/dev fallback. The same `getChunks` is injected into quiz generation, whose prompt source now comes from chunks with an optional source argument on `buildQuizPrompt`. `buildChunks` derives hotspot IDs when no allowlist is passed. Embed script discovers all MDX files and has an optional `--write` upsert mode. | `tests/integration/tutor.test.ts` embedded-chunk cosine ranking, `minCosine` rejection before generation, and a second lesson served through the port; `tests/unit/quiz.test.ts` proves quiz uses injected chunks instead of the hardcoded mirror. | fixed |
| F3 (High) — coverage gate measured the wrong modules | `vitest.config.ts:9–29` | `coverage.include` broadened to all 11 logic-bearing modules listed in the brief; thresholds stay 80 for statements/branches/functions/lines and `thresholds.perFile: true` is now set. Real tests were written for previously uncovered behavior. | `tests/unit/events.test.ts` (new), expanded `hotspot-store`, `offline-queue` (minimal fake IndexedDB), `prompt` and `retrieval` tests. | fixed |
| F5 (Low) — naming | `api/src/routes/quiz.ts:55`, `:176`, `:223` | `StoredQuestion.userid` renamed to `userId` at all declaration and use sites. | Existing quiz integration/unit coverage plus the new injected-source quiz test. | fixed |

## Verification

Exact command: `pnpm verify:full`
**Final exit code: 0**

| Command | Exit code | Summary |
| --- | --- | --- |
| `pnpm lint` | 0 | No errors; 6 pre-existing warnings (4 IndexedDB `on*` handlers in `src/lib/offline-queue.ts`, 2 `Array#sort` in `tests/integration/glb-manifest.test.ts`). |
| `pnpm fmt:check` | 0 | 82 files formatted correctly. Two earlier runs in this round exited 5 while printing “All matched files use the correct format”; per the brief these were rerun, not blindly reformatted. |
| `pnpm typecheck` | 0 | `astro sync` + `tsc --noEmit` clean. |
| `pnpm test` | 0 | 13 unit files, 98 tests passed. |
| `pnpm coverage` | 0 | 13 unit files, 98 tests, per-file gate passes. Table below. |
| `pnpm test:integration` | 0 | 5 files, 32 tests passed. |
| `pnpm build` | 0 | 3 static pages (`/`, `/lessons/heart/`, `/verify/`); only the existing large-chunk warning. |
| `pnpm smoke` | 0 | 1 smoke test passed. |
| `pnpm test:e2e` | 0 | 17 E2E tests passed: smoke, tutor (3), learning-loop (1), a11y (3), scene (7 incl. 3 new), perf (1). Playwright webServer teardown logged a non-fatal `ELIFECYCLE` message after the suite completed; the command exited 0. |

### Coverage table (verbatim from final `pnpm coverage`)

```text
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   98.59 |     91.7 |    97.8 |   99.11 |
 api/src/lib       |   98.75 |     90.9 |     100 |   98.71 |
  badge.ts         |   97.61 |    92.59 |     100 |   97.56 | 128
  events.ts        |     100 |     87.5 |     100 |     100 | 58
  mastery.ts       |   95.83 |    80.43 |     100 |   95.65 | 30,108
  quota.ts         |     100 |    93.75 |     100 |     100 | 20
  retrieval.ts     |     100 |    96.15 |     100 |     100 | 142,307
 src/lib           |   98.27 |       95 |   94.44 |     100 |
  hotspot-store.ts |     100 |    93.33 |     100 |     100 | 17
  offline-queue.ts |   96.87 |       90 |   89.47 |     100 | 67
-------------------|---------|----------|---------|---------|-------------------
Statements   : 98.59% ( 352/357 )
Branches     : 91.7% ( 188/205 )
Functions    : 97.8% ( 89/91 )
Lines        : 99.11% ( 335/338 )
```

Every included module exceeds 80% on all four metrics; `perFile: true` is enforced. `scene-manifest.ts`, `api-client.ts`, `prompt.ts` and `intent.ts` are at 100% and omitted from the text reporter's non-100% listing.

### Lighthouse (from the `@perf` E2E test)

```text
Lighthouse /: {"accessibility":1,"best-practices":0.96,"performance":1,"seo":1}
Lighthouse /lessons/heart/: {"accessibility":1,"best-practices":0.96,"performance":0.98,"seo":1}
```

All thresholds remain unchanged: performance ≥0.95, accessibility ≥0.95, best-practices ≥0.90, SEO ≥0.90, plus the zero-JS catalog assertion.

## Human-only exceptions

- Real production retrieval requires `DATABASE_URL` pgvector data ingested with `LLM_API_KEY` via `node --experimental-strip-types scripts/embed-lessons.ts --write`; verification uses injected fakes and the local MDX fallback only.
- Real social sign-in requires GitHub/Google OAuth credentials and a deployed `BETTER_AUTH_URL`; not exercised in automated checks.
- True WebGPU/WebGL hardware behavior cannot be guaranteed in headless CI; the QA `?rendererErrors=N` hook exercises the step-down ladder deterministically. Manual confirmation on GPU hardware remains a human task.

## Deviations

- Added a `data-quiz-hydrated` marker and disabled the quiz generate button until Astro hydration completes. This is a small reliability signal needed after the deferred-3D change exposed a click-before-hydration race in the learning-loop E2E; it does not change quiz behavior or weaken the assertion.
- The F2 local/dev chunk fallback remains available when `DATABASE_URL` is absent, as explicitly permitted by the brief; real deployments must ingest embeddings first.

## Commits

| Commit | Description |
| --- | --- |
| `0bae1a4` | fix(scene): make renderer step-down recover and delay readiness until GLB loads |
| `3fdffc7` | fix(retrieval): serve embedded lesson chunks from a repository port |
| `c05b55a` | test(coverage): gate all logic-bearing modules with per-file 80 percent thresholds |
| `befd0ea` | test(quiz): wait for island hydration before generating a question |
| `74190cf` | docs(conductor): record review-fix round 1 verification evidence |

## Primary verification

Reserved for the primary agent if it reruns `pnpm verify:full`.

## Residual F2 follow-up (2026-11-24)

Primary inspection found two remaining hardcoded heart assumptions after the first F2 fix. They are now closed at code head `d9446f7`:

- `api/src/routes/quiz.ts` now derives the allowed hotspot set from the injected `getChunks` source (`lessonContext`) and uses it to validate both the requested `hotspotId` and the generated `hotspotId`/`remediationId`. Direct/dev callers without a chunk source still fall back to `DEFAULT_HOTSPOTS`.
- `buildQuizPrompt` takes an optional hotspot list, lists only those IDs, and no longer says “for anatomy learners” or heart-specific wording.
- `tests/unit/quiz.test.ts:104` generates for a second, non-heart lesson (`planets` / `planet_core`) through a fake chunk source and asserts the new ID appears in the prompt and response. The earlier brain-lesson test now uses its own `cortex` vocabulary rather than a heart hotspot.
- `src/components/tutor/TutorDock.tsx` gained a `data-tutor-hydrated` marker, and `tests/e2e/tutor.spec.ts` waits for it before clicking chips. This closes a click-before-hydration race exposed after the deferred-3D change; it does not alter tutor behavior or weaken assertions.

Final exact command: `pnpm verify:full` — **exit code 0**. Summary: lint with the same 6 pre-existing warnings, fmt:check clean, typecheck clean, 13 unit files / 99 tests, coverage unchanged at 98.59% statements / 91.7% branches / 97.8% functions / 99.11% lines with per-file 80% gates, 5 integration files / 32 tests, 3-page build, 1 smoke test, 17 E2E tests. Lighthouse: catalog `{accessibility:1,best-practices:0.96,performance:1,seo:1}`, lesson `{accessibility:1,best-practices:0.96,performance:0.99,seo:1}`.

## F6 — interactive heart framing and hotspot anchors (Medium)

Recorded in `conductor/tracks/20261124-showcase-mvp/review.md:101–107` after primary browser verification. Fixed at code head `ba47ed8`.

| Finding | Location | Fix applied | Regression test | Status |
| --- | --- | --- | --- | --- |
| F6 — oversized/cropped WebGPU heart and misaligned anchors | `src/components/scene/HeartScene.tsx:11`, `src/content/lessons/heart.mdx:10–32` | `POSITION_SCALE` is now 1 so manifest coordinates are used verbatim. All six MDX hotspot `position` values were replaced with the measured GLB node centres (e.g. `left_ventricle` `[-0.35,-0.15,0]`, `aorta` `[0.196,1.452,0]`). The base camera moved to `[0,0.35,7]` targeting `[0,0.45,0]` at `fov: 42`, giving a ~5.37-unit view height for a ~3.41-unit-tall model. Focus tweening now blends only 30% toward the hotspot for look-at and 15% for camera travel, so all six focuses keep the full model in frame. Shared math lives in `src/components/scene/framing.ts`. | `tests/integration/glb-manifest.test.ts` now parses the GLB JSON, derives each named node's world centre from mesh accessor bounds plus node translation, and asserts every MDX hotspot is within 0.1 units of that centre. A second test computes overall model bounds and asserts base and all six focused camera poses provide ≥1.2× view-height margin and keep every bounding-box corner inside the vertical frustum. | fixed |

Final exact command after the F6 fix: `pnpm verify:full` — **exit code 0**. Summary: lint with the same 6 pre-existing warnings, intermittent oxfmt exit 5 rerun once, fmt:check clean, typecheck clean, 13 unit files / 99 tests, coverage unchanged at 98.59% statements / 91.7% branches / 97.8% functions / 99.11% lines with per-file 80% gates, 5 integration files / 34 tests (2 new geometry/framing tests), 3-page build, 1 smoke test, 17 E2E tests. Lighthouse: catalog `{accessibility:1,best-practices:0.96,performance:1,seo:1}`, lesson `{accessibility:1,best-practices:0.96,performance:0.97,seo:1}`.

## F7 — interactive model lighting and active highlight (High)

Recorded in `conductor/tracks/20261124-showcase-mvp/review.md:109–115` after primary browser re-check. Fixed at code head `59fff18`.

| Finding | Location | Fix applied | Verification | Status |
| --- | --- | --- | --- | --- |
| F7 — GLB materials rendered cyan/black because the Canvas had no lights | `src/components/scene/HeartScene.tsx` (`Canvas` children, `ACTIVE_EMISSIVE_INTENSITY`) | Added shared Canvas lights so both WebGPU and WebGL tiers receive them: `ambientLight` 0.75, `hemisphereLight` white/dark-blue 0.65, a warm key `directionalLight` at `[3,5,5]` intensity 1.9, and a cooler fill `directionalLight` at `[-4,2,-3]` intensity 0.65. These let the GLB's authored red/blue/purple/tan `baseColorFactor` values read without flattening the model to white. Reduced the active-hotspot cyan emissive from intensity 0.9 to a new `ACTIVE_EMISSIVE_INTENSITY` constant of 0.22 so the accent stays visible while the mesh's base colour remains dominant. | No DOM-level assertion can judge material lighting; the existing scene, E2E, a11y and Lighthouse suites still pass with the lighting in place. Primary browser visual re-check on both renderer tiers remains the human-only confirmation. | fixed |

Visual rationale: the poster uses a dark cinematic shell, so neutral white ambient alone would wash out the PBR colours. A white sky / dark-blue ground hemisphere plus a warm key and cool fill preserves depth and the authored palette; the low cyan emissive is an accent, not a replacement albedo.

Final exact command after the F7 fix: `pnpm verify:full` — **exit code 0**. Summary: lint with the same 6 pre-existing warnings, fmt:check clean on 83 files, typecheck clean, 13 unit files / 99 tests, coverage unchanged at 98.59% statements / 91.7% branches / 97.8% functions / 99.11% lines with per-file 80% gates, 5 integration files / 34 tests, 3-page build, 1 smoke test, 17 E2E tests. Lighthouse: catalog `{accessibility:1,best-practices:0.96,performance:1,seo:1}`, lesson `{accessibility:1,best-practices:0.96,performance:0.96,seo:1}`. An earlier retry in this round failed only in `chrome.kill()` with a transient Windows `EPERM ... lighthouse.<tmp>` cleanup error after the catalog audit; the immediate rerun passed without changes.
