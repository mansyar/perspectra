# Review: Showcase MVP

- **Track:** `20261124-showcase-mvp`
- **Type:** `mvp`
- **Branch:** `feat/20261124-showcase-mvp`
- **Range:** `79c054e8d6e5ca89d7cc389210b768b8484f9b17..59cbe67f7b705e69fc3b5835aa7c182a93f80476`
- **Date:** `2026-11-24T13:10:16+11:00`
- **Verdict:** `BLOCK`

## Summary

The six implementation phases are individually verified and the integrated checks pass, but the independent reviewer found three High-severity conformance gaps that must be fixed before this track can be accepted. The WebGPU→WebGL step-down cannot remount its scene, the runtime tutor/quiz retrieval never uses pgvector embeddings or the cosine threshold and depends on a hardcoded MDX mirror, and the coverage gate measures none of the logic modules NFR-7 names. A further High finding (missing scene lighting) and three lower-severity findings (poster removal timing, one naming inconsistency, and a 3D framing defect) were found during primary browser verification after the initial fixes and are also being addressed in round 1. All findings were checked against the track diff and their cited lines by the primary orchestrator. All seven findings were fixed in round 1; primary browser verification passed on both renderer tiers, and a re-review is pending.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass | 83 unit tests, exit 0 |
| coverage | `pnpm coverage` | pass | exit 0, but only `src/lib/scene-manifest.ts` measured — see F3 |
| lint | `pnpm lint` | pass | 6 pre-existing warnings, 0 errors |
| format | `pnpm fmt:check` | pass | one transient exit 5 with "all files correct"; rerun exit 0 |
| typecheck | `pnpm typecheck` | pass | exit 0 |
| build | `pnpm build` | pass | 3 static pages |
| integrated | `pnpm verify:full` | pass | exit 0; 1 smoke + 14 E2E (axe, Lighthouse, tutor, learning loop) |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 / AC-1 / NFR-1 / AC-18 | P1.T5, P6.T1, P6.T3 | `tests/e2e/performance.spec.ts`, `dist/index.html`, Lighthouse | covered |
| FR-2 / AC-2 / AC-16 / NFR-9 | P1.T3, P1.T6 | `tests/unit/manifest*.test.ts`, `tests/integration/content-contract.test.ts` | partial (F2) |
| FR-3 / AC-3 / AC-4 / NFR-2 | P2.T1–P2.T3 | `tests/integration/glb-manifest.test.ts`, `tests/e2e/scene.spec.ts` | partial (F1, F4) |
| FR-4 / AC-5 | P2.T4 | `tests/unit/hotspot-store.test.ts`, `tests/e2e/scene.spec.ts` | covered |
| FR-5 / AC-6 / NFR-6 | P4.T4 | `tests/unit/quota.test.ts`, `tests/integration/tutor.test.ts` | covered |
| FR-6 / AC-7 | P3.T3 | `api/src/lib/auth.ts`, `tests/integration/progress.test.ts`, human-only OAuth exception | covered |
| FR-7 / AC-8 | P4.T1 | `tests/unit/retrieval.test.ts`, `tests/integration/tutor.test.ts` | partial (F2) |
| FR-8 / AC-9 / AC-10 | P4.T2, P4.T4 | `tests/unit/{intent,prompt,quota}.test.ts`, `tests/integration/tutor.test.ts` | partial (F2) |
| FR-9 / AC-11 | P5.T2 | `tests/unit/quiz.test.ts`, `tests/e2e/learning-loop.spec.ts` | covered |
| FR-10 / AC-12 | P5.T1, P5.T3 | `tests/unit/mastery.test.ts`, `tests/e2e/learning-loop.spec.ts` | covered |
| FR-11 / AC-13 | P3.T5 | `tests/unit/offline-queue.test.ts`, `tests/integration/progress.test.ts` | covered |
| FR-12 / AC-14 / AC-15 | P5.T4 | `tests/unit/badge.test.ts`, `tests/integration/badge.test.ts` | covered |
| FR-13 / AC-4 | P2.T1 | `assets/heart/ASSET_CONTRACT.md`, `tests/integration/glb-manifest.test.ts` | covered |
| FR-14 / AC-19 / AC-20 / NFR-5 | P2.T5, P4.T5, P6.T2 | `tests/e2e/a11y.spec.ts`, `tests/e2e/tutor.spec.ts` | covered |
| NFR-3 / NFR-4 / AC-21 | P3.T1, P3.T4, P4.T4, P6.T5 | source audits, `tests/e2e/tutor.spec.ts` | covered |
| NFR-6 | P2.T3, P4.T4 | `tests/integration/tutor.test.ts`, `tests/e2e/scene.spec.ts` | partial (F1) |
| NFR-7 / AC-17 | P1.T2, P4.T6, P5.T5 | `vitest.config.ts`, `coverage/coverage-summary.json` | missing (F3) |
| NFR-8 / AC-22 | P6.T4 | `LICENSE`, `README.md`, `tests/integration/content-contract.test.ts` | covered |

## Findings

### Critical

- <none>

### High

- **F1 — WebGPU→WebGL step-down renders nothing (error boundary never resets)**
  - **File:** `src/components/scene/SceneIsland.tsx:99`
  - **What:** `RendererErrorBoundary` is rendered without a changing key and `state.failed` is permanent (`RendererErrorBoundary.tsx:13–24`). `stepDown()` changes the tier from `webgpu` to `webgl` and sets `ready=false`, but React reuses the boundary instance, so it keeps returning `null` and `HeartScene` never remounts. The learner is left on a poster with no start button (`interactive` stays true) and no status text (tier is `webgl`, not `poster`).
  - **Why:** AC-3 / NFR-6 require a working WebGPU→WebGL→poster ladder; a runtime WebGPU failure cannot fall back and there is no retry.
  - **Fix:** Key the boundary by tier, e.g. `<RendererErrorBoundary key={tier} onError={stepDown}>`, so a step-down remounts it with `failed=false`; also surface status/retry affordance when a tier fails.
  - **Requirement:** AC-3, NFR-6
  - **Test gap:** Scene E2E that forces a renderer error, asserts `data-renderer="webgl"` with a mounted canvas/retry, then a second failure to `poster`.

- **F2 — Tutor/quiz retrieval is lexical-only over a hardcoded MDX mirror; no pgvector or cosine threshold at runtime**
  - **File:** `api/src/lib/retrieval.ts:187`
  - **What:** `loadLessonChunks()` builds chunks from the in-source `HEART_LESSON_MDX` string; those chunks carry no embeddings, so `retrieveChunks()` always takes the lexical branch and the query embedding fetched in `tutor.ts:167–171` is discarded. `minCosine=0.7` is never applied. No runtime code reads `lesson_embedding`; `scripts/embed-lessons.ts` emits NDJSON only. `quiz.ts:71` also hardcodes the mirror.
  - **Why:** FR-7 / FR-8 require grounded hybrid BM25+vector retrieval with a cosine threshold, and NFR-9 / AC-16 require adding topics via MDX + GLB only.
  - **Fix:** Wire a DB-backed chunk source that loads `lesson_embedding` rows (with embeddings) for the lesson and use it as `getChunks` in tutor/quiz so cosine + lexical ranking and `minCosine` actually run; drive quiz prose from the same content. If the mirror is retained by design, withdraw or explicitly downgrade FR-7/FR-8/NFR-9 and record the deviation.
  - **Requirement:** FR-7, FR-8, NFR-9, AC-8, AC-9, AC-10, AC-16
  - **Test gap:** Integration test with embedded chunks asserting cosine filtering and `minCosine` rejection; second-topic test proving no code change is needed.

- **F3 — Coverage gate measures none of the modules NFR-7 names**
  - **File:** `vitest.config.ts:9`
  - **What:** `coverage.include` is only `src/lib/scene-manifest.ts`. NFR-7 requires 80% line/branch coverage on mastery, retrieval/scoring, prompt assembly, validation and badge logic. Those modules have unit tests but are excluded, so the reported 100% proves nothing about them; phase-6 and integrated evidence record NFR-7 as met on that basis.
  - **Why:** AC-17 assumes the configured "logic-bearing modules" are the NFR-7 set; the required coverage is unmeasured and the evidence overstates conformance.
  - **Fix:** Set `coverage.include` to the actual logic modules, keep 80% thresholds, raise coverage on gaps, and commit the resulting summary as evidence.
  - **Requirement:** NFR-7, AC-17
  - **Test gap:** Re-run `pnpm coverage` with the broadened include and commit `coverage/coverage-summary.json` as evidence.

### Medium

- **F4 — Poster is hidden on Canvas creation, before the GLB is loaded**
  - **File:** `src/components/scene/HeartScene.tsx:230`
  - **What:** `onReady` is wired to `<Canvas onCreated>`, which fires before the suspended `SceneContents`/`useGLTF` resolves, while `SceneIsland.tsx:71` hides the poster as soon as `ready` is true. The GET probe does not populate the GLTF loader cache.
  - **Why:** NFR-2 requires the poster until the scene is ready; slow loads show an empty viewport.
  - **Fix:** Signal readiness from inside `SceneContents` after `useGLTF` resolves (or via a small ready component), not from `onCreated`.
  - **Requirement:** NFR-2
  - **Test gap:** E2E that delays the GLB and asserts the poster stays visible until a mesh is present.

### Low

- **F5 — Non-conforming identifier `userid` on a changed line**
  - **File:** `api/src/routes/quiz.ts:53`
  - **What:** `StoredQuestion` declares `userid: string` (used at lines 154 and 201) instead of lowerCamelCase `userId`.
  - **Why:** Inconsistent naming in new code; no functional impact.
  - **Fix:** Rename the field to `userId` in the interface and both usages.
  - **Requirement:** none (TypeScript style guide)
  - **Test gap:** none

- **F6 (Medium, found during primary browser verification after initial fixes) — interactive 3D heart is cropped and hotspot anchors are misaligned**
  - **File:** `src/components/scene/HeartScene.tsx:11`, `src/content/lessons/heart.mdx:10–32`
  - **What:** With the default active hotspot, the WebGPU canvas renders oversized, cropped cyan/black geometry instead of the framed heart shown on the poster. The exported GLB has a world-space Y range of roughly `-1.34…2.07` (height ~3.4 units) while the camera sits at `z=4.2` with `fov=42`, giving a view height of only ~3.2 units. In addition, `POSITION_SCALE = 2.5` maps the MDX anchors to points that do not match the GLB node centres (for example, `left_ventricle` resolves to `[0.55,-0.45,0.95]` while the actual node centre is near `[-0.35,-0.15,0]`).
  - **Why:** AC-3/AC-4/NFR-2 require a navigable scene whose hotspots correspond to the visible anatomy and whose fallback poster matches the interactive view. The current framing makes the flagship demo unusable even though the DOM-level E2E checks pass.
  - **Fix:** Widen the camera framing (for example `position: [0,0.35,7]`, `target: [0,0.45,0]`, keeping `fov: 42`) or scale the model group down so the whole heart fits with margin; set `POSITION_SCALE` to 1 and update the MDX hotspot positions to the real GLB node centres; keep the camera tween from cropping when a hotspot is focused. Add a regression check for framing/anchor alignment and verify visually in a browser after the fix.
  - **Requirement:** AC-3, AC-4, NFR-2
  - **Test gap:** E2E/geometry assertion that the camera view encompasses the GLB bounds and that each hotspot anchor is within tolerance of its named mesh centre.
  - **Status:** fixed in round 1 — `POSITION_SCALE=1`, MDX anchors set to measured GLB node centres, camera reframed to `[0,0.35,7]` → `[0,0.45,0]` at fov 42, with integration assertions for anchor alignment and frustum containment. Browser re-check passed; see `verification/browser.md`.

- **F7 (High, found during primary browser re-check after the F6 fix) — interactive model has no lights, so materials render black/cyan**
  - **File:** `src/components/scene/HeartScene.tsx:249–263`
  - **What:** After F6, the heart is framed correctly but renders as one cyan chamber and several near-black shapes. The GLB contains PBR materials with correct red/blue/purple `baseColorFactor` values (verified from the GLB JSON), but the R3F `<Canvas>` adds no ambient, hemisphere or directional lights, and no environment map. The only lit-looking surface is the active mesh's cyan emissive highlight.
  - **Why:** The product is visual-first; a black/cyan model does not match the poster or the semi-realistic low-poly art direction and makes the flagship demo look broken even though the DOM/E2E checks pass.
  - **Fix:** Add suitable lights to the Canvas (e.g. ambient + hemisphere + key/fill directional lights) so the GLB's authored colours are visible, and reduce/tune the active emissive highlight so it accents rather than replaces the mesh colour. Re-check visually in the browser on both WebGPU and WebGL tiers.
  - **Requirement:** AC-3, NFR-2
  - **Test gap:** No DOM-level test can assess material lighting; primary browser verification must confirm the authored colours appear on both renderer tiers.
  - **Status:** fixed in round 1 — ambient, hemisphere, key and fill lights added to the shared Canvas, and active emissive reduced from 0.9 to 0.22. Primary browser re-check on both WebGPU and forced WebGL tiers passed; see `verification/browser.md`.

## Overrides

- <none>

## Plan compliance

All six phases are marked verified with checkpoints and per-phase evidence, and all 34 top-level plan tasks are `[x]`. Metadata reports `tasks_total=38` / `tasks_done=34`; the remaining four are subtasks nested under P1.T3 and P2.T1, so this is a counting-convention inconsistency to reconcile during state sync, not unfinished work. No task is marked complete without phase verification.

## Out of scope

Excluded from review: `conductor/**` prose and track state, generated `dist/**`, `coverage/**`, `pnpm-lock.yaml`, binary assets, and `assets/heart/build_heart.py`. E2E specs mock API endpoints, so they verify UI wiring; backend behavior was assessed from unit/integration tests and source. Real OAuth/LLM/Cloudflare/WebGPU-hardware paths remain documented human-only exceptions.

## Debt

- <none>

## Doc sync

`updated` — tech-stack scheduler/tooling note applied before this review, as recorded in `conductor/tech-stack.md`.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK → pending re-review | 0 | 4 | 2 | 1 | 7 |
