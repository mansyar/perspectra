# Phase 6 Verification — Polish & Proof

- **Track:** `20261124-showcase-mvp`
- **Phase:** 6 — Polish & Proof
- **Date:** 2026-11-24
- **Branch:** `feat/20261124-showcase-mvp`
- **Base commit:** `db3059e` (conductor plan marked phase in progress)
- **Code head commit:** `53318c2`
- **Result:** VERIFIED

## Goal

The showcase meets its performance, accessibility, licensing, and documentation bar with committed evidence.

## Tasks covered

| Task | Summary | Evidence |
| --- | --- | --- |
| P6.T1 | Dark cinematic shell, light reading surface, semantic tokens, WCAG 2.2 AA focus/contrast, 360px-up responsive layout | `src/styles/global.css`, `src/styles/lesson.css`, component CSS, `src/pages/verify.astro` |
| P6.T2 | Axe audit, keyboard traversal, Enter/Space activation, reduced-motion prose/hotspot binding | `tests/e2e/a11y.spec.ts` |
| P6.T3 | Lighthouse budgets, zero-JS static catalog assertion, deferred 3D to fix lesson performance | `lighthouse.config.mjs`, `lighthouse.config.d.mts`, `tests/e2e/performance.spec.ts`, `src/components/scene/SceneIsland.tsx` |
| P6.T4 | Product/README, architecture, exact demo walkthrough | `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO.md` |
| P6.T5 | Full verification, evidence, focused commits | This file and commits below |

## Verification commands

| Command | Exit code | Summary |
| --- | --- | --- |
| `pnpm verify:full` | **0** | Full chain (lint, fmt:check, typecheck, 83 unit tests, 100% gated coverage, 30 integration tests, 3-page build, smoke, 14 E2E tests) |
| `pnpm lint` | 0 | Only 6 pre-existing warnings (4 IndexedDB `on*` handlers in `src/lib/offline-queue.ts`, 2 `Array#sort` in `tests/integration/glb-manifest.test.ts`) |
| `pnpm fmt:check` | 0 | All 80 matched files formatted; intermittent exit 5 observed on some identical runs (see Deviations) |
| `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` clean |
| `pnpm test` | 0 | 12 files, 83 tests passed |
| `pnpm coverage` | 0 | 100% statements/branches/functions/lines on unchanged `src/lib/scene-manifest.ts` include list |
| `pnpm test:integration` | 0 | 5 files, 30 tests passed |
| `pnpm build` | 0 | 3 static pages; large-chunk warning retained from three.js bundle |
| `pnpm smoke` | 0 | 1 smoke test passed |
| `pnpm test:e2e` | 0 | 14 tests passed (`@smoke`, `@tutor`, `@learning-loop`, `@a11y`, `@perf`) |
| `pnpm test:a11y` | 0 | 3 focused axe/keyboard/reduced-motion tests passed |
| `pnpm perf:lighthouse` | 0 | 1 focused Lighthouse budget test passed |

## Lighthouse scores and budgets

Thresholds shared in `lighthouse.config.mjs`: performance ≥ 0.95, accessibility ≥ 0.95, best-practices ≥ 0.90, SEO ≥ 0.90.

| Path | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 1.00 | 1.00 | 0.96 | 1.00 |
| `/lessons/heart/` | 0.96 | 1.00 | 0.96 | 1.00 |

Additional assertions: `dist/index.html` contains no `<script>` tag (zero-JS catalog), and the catalog JS byte budget is 0 KB. The lesson initially measured performance 0.82 (LCP 3.3s, TBT 400ms); the fix deferred the heavy 3D module until the learner opts into the interactive view and kept the poster/prose path available immediately. No threshold was lowered.

## Accessibility evidence

- Axe (`@a11y`) reports zero serious or critical violations and zero trivially fixable moderate violations on `/`, `/lessons/heart/`, and `/verify/`.
- Keyboard traversal reaches the catalog card, six scene hotspot buttons, tutor chips, quiz options, and verifier input; focus-visible outlines are present. Enter activates hotspot buttons and Space activates tutor chips.
- Reduced-motion emulation keeps `.prose` visible and the hotspot→prose `.is-active` binding working.
- Mastery cells use `data-mastery-hotspot` (not `data-hotspot`) and rely on their text content for an accessible name, avoiding strict-mode and label/name mismatches.
- The tutor's AI disclosure and privacy note remain visible before the first prompt (also covered by `@tutor`).

## Acceptance criteria mapping

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-1 (static catalog, zero client JS) | Met | `assertStaticCatalog` on `dist/index.html`, catalog JS budget 0, Lighthouse catalog performance 1.00 |
| AC-18 (Lighthouse performance ≥ 95 on catalog and prose) | Met | 1.00 catalog, 0.97 lesson |
| AC-19 (reduced motion disables tweens, hotspots keyboard reachable, prose usable) | Met | `@a11y` reduced-motion test, scene keyboard/reduced-motion tests, deferred 3D keeps prose first |
| AC-20 (AI disclosure and privacy before first tutor use) | Met | `src/components/tutor/TutorDock.tsx`, `@tutor` E2E |
| AC-22 (MIT code, CC0/OFL assets, no share-alike shipped) | Met | `README.md` license section; Z-Anatomy/BodyParts3D documented as reference-only |

Also covers FR-1, FR-14, NFR-1, NFR-5, NFR-6, NFR-8.

## Security and degradation checks

- `dist/**` contains no `BETTER_AUTH_SECRET`, `LLM_API_KEY`, `EMBEDDING_API_KEY`, GitHub/Google client secrets, or test-secret literals.
- A missing or blocked GLB falls back to `data-renderer="poster"` with the complete prose lesson still visible; renderer errors step down webgpu → webgl → poster.
- No existing test was weakened, skipped, or deleted; no dependency, lockfile, package script, coverage include list, or lint/format config changed.

## Deviations

1. `conductor/tech-stack.md` line 14 still names `fsrs 1.0.0`; the installed and used scheduler is `ts-fsrs 6.0.1`. This file is outside this phase's Touches and was **not** edited.
2. `pnpm fmt` / `pnpm fmt:check` intermittently returned exit code 5 while printing “All matched files use the correct format.” Re-running yielded exit 0, and the final `pnpm verify:full` (which includes `fmt:check`) exited 0. No format config was changed.
3. Mastery cells use `data-mastery-hotspot` rather than the brief's suggested `data-hotspot`, because prose sections already own `data-hotspot` and the collision broke the existing smoke test's strict-mode locator.
4. Focused E2E runs against a stale `dist` produced false failures; `pnpm build` was run before each focused rerun, and the final full verification rebuilds first.
5. A console.info in the perf spec records exact Lighthouse category scores for evidence; it does not affect assertions.

## Blockers

None.

## Human-only exceptions

None.

## Commits

| Commit | Description |
| --- | --- |
| `8aa15b6` | feat(design): add accessible cinematic shell with semantic tokens |
| `00ec559` | perf(scene): defer interactive 3D until the learner opts in |
| `0068d94` | docs: add README, architecture and demo walkthrough |
| `eb32fe1` | test(a11y): add axe, keyboard and reduced-motion coverage |
| `53318c2` | test(perf): add Lighthouse budgets and zero-JS catalog assertion |
| `d3fcadc` | docs(conductor): record phase 6 verification evidence |

## Primary verification

Primary independently ran `pnpm verify:full` at 2026-11-24 13:01 +11:00 with exit code **0**.

| Command | Exit code | Result |
| --- | --- | --- |
| `pnpm lint` | 0 | 6 pre-existing warnings, 0 errors |
| `pnpm fmt:check` | 0 | 80 files formatted |
| `pnpm typecheck` | 0 | clean |
| `pnpm test` | 0 | 83 tests passed |
| `pnpm coverage` | 0 | 100% on configured gate module |
| `pnpm test:integration` | 0 | 30 tests passed |
| `pnpm build` | 0 | 3 static pages |
| `pnpm smoke` | 0 | 1 smoke test passed |
| `pnpm test:e2e` | 0 | 14 tests passed |

Primary Lighthouse run: catalog `{performance: 1.00, accessibility: 1.00, best-practices: 0.96, seo: 1.00}`; lesson `{performance: 0.96, accessibility: 1.00, best-practices: 0.96, seo: 1.00}`. Both meet the ≥0.95 performance/accessibility gate. Diff `db3059e..HEAD` contained only allowed Touches plus this evidence file.
