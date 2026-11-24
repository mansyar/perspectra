# Review: Showcase MVP

- **Track:** `20261124-showcase-mvp`
- **Type:** `mvp`
- **Branch:** `feat/20261124-showcase-mvp`
- **Range:** `79c054e8d6e5ca89d7cc389210b768b8484f9b17..41691650ee681dc5ec2ff41c537644d0dfc5ac8b`
- **Date:** `2026-11-24T14:55:00+11:00`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

All six implementation phases and both review fix rounds pass together. The initial reviewer found three High gaps (renderer step-down, runtime retrieval and coverage measurement); primary browser verification then found two visual defects (framing and lighting), and re-review found a production second-lesson retrieval regression plus residual topic lock. All seven round-1 findings and both round-2 findings are fixed in source and covered by real tests. The final re-review found no Critical or High issue and one non-blocking Low residual in badge prose wording. Review strictness is `false`, so the track is acceptable.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass | 103 unit tests, exit 0 |
| coverage | `pnpm coverage` | pass | 98.6% stmts / 91.7% branches / 97.84% funcs / 99.11% lines; every included module ≥80% |
| lint | `pnpm lint` | pass | 6 pre-existing warnings, 0 errors |
| format | `pnpm fmt:check` | pass | intermittent exit 5 with "all files correct"; rerun exit 0 |
| typecheck | `pnpm typecheck` | pass | exit 0 |
| build | `pnpm build` | pass | 3 static pages |
| integration | `pnpm test:integration` | pass | 37 tests, exit 0 |
| smoke | `pnpm smoke` | pass | 1 test |
| e2e | `pnpm test:e2e` | pass | 17 tests including renderer step-down, poster fallback, delayed GLB, tutor, learning loop, axe and Lighthouse |
| integrated | `pnpm verify:full` | pass | exit 0 on final rerun |
| browser | in-app browser skill | pass | WebGPU and forced WebGL visual/console pass; see `verification/browser.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 / AC-1 / NFR-1 / AC-18 | P1.T5, P6.T1, P6.T3 | `tests/e2e/performance.spec.ts`, `dist/index.html`, Lighthouse | covered |
| FR-2 / AC-2 / AC-16 / NFR-9 | P1.T3, P1.T6, R1.T2, R2.T1–R2.T3 | manifest tests, content-contract tests, production-path tutor test, topic-agnostic mastery/badge tests | covered (Low R2-L1 wording residual) |
| FR-3 / AC-3 / AC-4 / NFR-2 | P2.T1–P2.T3, R1.T1, R1.T4, R1.T6, R1.T7 | GLB/manifest test, scene E2E, browser pass | covered |
| FR-4 / AC-5 | P2.T4 | `tests/unit/hotspot-store.test.ts`, `tests/e2e/scene.spec.ts` | covered |
| FR-5 / AC-6 / NFR-6 | P4.T4 | `tests/unit/quota.test.ts`, `tests/integration/tutor.test.ts` | covered |
| FR-6 / AC-7 | P3.T3 | `api/src/lib/auth.ts`, `tests/integration/progress.test.ts`, human-only OAuth exception | covered |
| FR-7 / AC-8 | P4.T1, R1.T2, R2.T1 | `tests/unit/retrieval.test.ts`, `tests/integration/tutor.test.ts` | covered |
| FR-8 / AC-9 / AC-10 | P4.T2, P4.T4, R2.T3 | `tests/unit/{intent,prompt,quota}.test.ts`, `tests/integration/tutor.test.ts` | covered |
| FR-9 / AC-11 | P5.T2, R1.T2 | `tests/unit/quiz.test.ts`, `tests/e2e/learning-loop.spec.ts` | covered |
| FR-10 / AC-12 | P5.T1, P5.T3, R2.T3 | `tests/unit/mastery.test.ts`, `tests/e2e/learning-loop.spec.ts` | covered |
| FR-11 / AC-13 | P3.T5 | `tests/unit/offline-queue.test.ts`, `tests/integration/progress.test.ts` | covered |
| FR-12 / AC-14 / AC-15 | P5.T4, R2.T3 | `tests/unit/badge.test.ts`, `tests/integration/badge.test.ts` | covered |
| FR-13 / AC-4 | P2.T1 | `assets/heart/ASSET_CONTRACT.md`, `tests/integration/glb-manifest.test.ts` | covered |
| FR-14 / AC-19 / AC-20 / NFR-5 | P2.T5, P4.T5, P6.T2 | `tests/e2e/a11y.spec.ts`, `tests/e2e/tutor.spec.ts` | covered |
| NFR-3 / NFR-4 / AC-21 | P3.T1, P3.T4, P4.T4, P6.T5 | source audits, `tests/e2e/tutor.spec.ts` | covered |
| NFR-6 | P2.T3, P4.T4, R1.T1 | `tests/integration/tutor.test.ts`, `tests/e2e/scene.spec.ts` | covered |
| NFR-7 / AC-17 | P1.T2, P4.T6, P5.T5, R1.T3 | `vitest.config.ts`, `coverage/coverage-summary.json` | covered |
| NFR-8 / AC-22 | P6.T4 | `LICENSE`, `README.md`, `tests/integration/content-contract.test.ts` | covered |

## Findings

### Critical

- <none>

### High

All original High findings are fixed:
- **F1 — WebGPU→WebGL step-down renders nothing**: fixed with a keyed `RendererErrorBoundary`, visible step-down status and poster retry. Scene E2E covers both renderer failures and the poster fallback.
- **F2 — Tutor/quiz retrieval lexical-only over a hardcoded MDX mirror**: fixed with a Drizzle-backed embedded chunk repository, cosine threshold, topic-agnostic `scripts/embed-lessons.ts` discovery, and production-path coverage.
- **F7 — Interactive model has no lights, so materials render black/cyan**: fixed with ambient, hemisphere, key and fill lights in the shared Canvas and a softened active emissive; browser pass confirms authored colours on WebGPU and WebGL.
- **N1 — Production chunk source filters out every non-heart hotspot**: fixed in R2. `api/src/index.ts` returns repository chunks unfiltered; `api/src/routes/tutor.ts` supplies no heart allowlist; `tests/integration/tutor.test.ts` injects only `chunkRepository` and asserts a grounded answer for a non-heart lesson.

### Medium

All original Medium findings are fixed:
- **F4 — Poster hidden before GLB load**: fixed by signaling readiness from inside the loaded scene; E2E delays the GLB and asserts poster persistence.
- **F6 — Cropped 3D heart and misaligned anchors**: fixed with `POSITION_SCALE=1`, measured GLB node centres, reframed camera and integration assertions for anchor alignment and frustum containment.
- **N2 — Residual heart-only vocabulary**: fixed in R2. Intent terms, mastery vocabulary, next-best ordering and badge hotspot sets derive from lesson chunks, falling back to heart only when no chunk source is available.

### Low

- **F5 — Non-conforming identifier `userid`**: fixed in round 1; `StoredQuestion.userId` is used consistently.
- **R2-L1 — Badge achievement narrative still hardcodes heart/six-landmark wording for non-heart lessons**
  - **File:** `api/src/lib/badge.ts:93–95`
  - **What:** `issue()` now receives the correct `lessonId` and credential achievement id/name, but the narrative says "Mastered all six landmarks of the `${input.lessonId}` lesson" and the description says "Demonstrated mastery of every heart landmark in the Perspectra lesson." For a second lesson the verifier displays factually wrong prose. The file was outside R2 Touches.
  - **Why:** Cosmetic/UX only — credential lesson ID, mastery vocabulary, issuance gate and HMAC verification are lesson-correct and tested. No correctness, security or data impact.
  - **Fix:** Derive the narrative from the lesson's hotspot count/vocabulary and drop the literal "heart" from the description.
  - **Requirement:** NFR-9
  - **Test gap:** When generalized, assert the issued credential narrative names the second lesson's hotspots/count.
  - **Status:** accepted as non-blocking under strict=false; schedule as follow-up.

## Overrides

- <none>

## Plan compliance

All six implementation phases and both review-fix phases are marked verified with checkpoints and evidence. Metadata reports `tasks_total=49` / `tasks_done=49`; all 49 top-level and fix tasks are `[x]`. No task is marked complete without phase verification.

## Out of scope

Excluded from review: `conductor/**` prose and track state, generated `dist/**`, `coverage/**`, `pnpm-lock.yaml`, binary assets, and `assets/heart/build_heart.py`. E2E specs mock API endpoints, so they verify UI wiring; backend behavior was assessed from unit/integration tests and source. Real OAuth/LLM/Cloudflare/WebGPU-hardware/Neon-ingest paths remain documented human-only exceptions.

## Debt

- R2-L1: generalize badge achievement narrative wording for non-heart lessons. Non-blocking; no remote issue was created because the repository has no git remote and the finding is Low.

## Doc sync

`updated` — final post-review sync applied to `metadata.json` and this review artifact; the tech-stack scheduler/tooling note was applied before review and recorded in `conductor/tech-stack.md`.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 4 | 2 | 1 | 7 |
| 2 | BLOCK | 0 | 1 | 1 | 0 | 2 |
| 3 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
