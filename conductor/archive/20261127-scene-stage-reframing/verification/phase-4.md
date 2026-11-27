# Phase 4 verification — Viewport and renderer acceptance coverage

- Track: `20261127-scene-stage-reframing`
- Branch: `feat/20261127-scene-stage-reframing`
- Phase base: `740a580b4c339851ee1227d2af65a16a10cba912`
- Scope: test-only, within the four files listed in the Phase 4 `Touches` plus this evidence file.

## Commits

1. `81ce6b2` — `test: strengthen GLB clip and responsive framing contracts` (P4.T1)
2. `c70ed5d` — `test: cover both lessons across target viewports` (P4.T2)
3. `d5f6c81` — `test: extend accessibility and console checks to both stages` (P4.T3)

## Changes

### P4.T1

- `tests/integration/glb-manifest.test.ts`
  - Strict bijection between declared animation clip IDs and exported GLB animation names.
  - Exported clips must target existing named hotspot mesh nodes.
  - New framing test calls the runtime `responsivePose` at the target page aspect ratios
    (1024/768, 1280/800, 390/844), at rest and focused on every hotspot.
  - Existing named-mesh, hotspot, budget, anchor, no-camera/no-light and rest/focus
    projected-bounds contracts remain intact.
- `tests/integration/content-contract.test.ts`
  - Added rejection of a trigger that references an undeclared clip.

### P4.T2

- `tests/e2e/scene.spec.ts`
  - Added 1024×768, 1280×800 and 390×844 viewport groups; each runs against both lessons.
  - Asserts stage/poster/guidance visibility, horizontal containment, no page overflow,
    hotspot tap-target size and containment.
  - Extracted a baseline-relative `assertClipReplay()` helper shared with the original replay
    test; validates focus-change replay, completion and re-focus replay without assuming an
    initial zero run/clip.
  - Reduced-motion test asserts a static stage with no clip or run increment.
  - No drag/orbit/pinch/zoom expectations were added.

### P4.T3

- `tests/e2e/a11y.spec.ts`
  - Added `/lessons/earth-interior/` to the axe audit path list.
  - Parameterised reduced-motion and guidance/keyboard checks over both lesson stages.
  - Added a console-clean test for both stages that ignores only 404 console messages whose
    URL pathname starts with `/api/` (expected in static preview), and fails on page errors
    and all other console errors.

## Checks

- `pnpm verify` (lint → fmt:check → typecheck → unit tests → coverage → integration → build):
  - First run stopped at the known `oxfmt` exit-5 flake after printing
    “All matched files use the correct format.”
  - Rerun (the single permitted retry) completed successfully: lint emitted only pre-existing
    warnings, formatting clean, typecheck clean, 23 files / 242 unit tests passed, coverage
    passed, 7 files / 90 integration tests passed, `astro build` produced 5 pages.
- `pnpm fmt:check` standalone also printed “All matched files use the correct format.” but
  exited 5, consistent with the documented flake; no config or check was relaxed.
- `pnpm exec oxfmt --check .` was permission-denied for this subagent; `pnpm fmt:check` runs the
  same `oxfmt --check .` command and was used as the allowed equivalent.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm coverage`, `pnpm test:integration` and
  `pnpm build` were exercised inside the passing `pnpm verify` run.
- `pnpm smoke` with `E2E_BASE_URL=http://127.0.0.1:4322`: 2 passed.
- `pnpm test:a11y` with `E2E_BASE_URL=http://127.0.0.1:4322`: 7 passed, including the new
  earth-interior axe, reduced-motion, guidance and console checks.
- `pnpm test:e2e` with `E2E_BASE_URL=http://127.0.0.1:4322`: 69 passed, 2 failed.
  - All 18 new viewport tests passed across the three viewports and both lessons.
  - `@production-earth` ran only because `E2E_BASE_URL` was set (it skips in the normal
    harness) and failed against local preview with a sign-up 404; unrelated to these changes.
  - Lighthouse `/lessons/heart/` scored performance 0.91 against the unchanged 0.95 budget on
    the initial run and its single configured retry, while `/` (1.0) and
    `/lessons/earth-interior/` (0.99) passed. This run used 8 workers.
- Exact `pnpm test:e2e` and `pnpm test:a11y` (no `E2E_BASE_URL`) could not start: the
  Playwright webServer command refused to start because an Astro preview instance already
  holds the lock on port 4322 (PID 29820). `pnpm preview stop`, `pnpm preview --force ...`,
  `pnpm test:e2e --grep-invert ...` and manual process commands were permission-denied for
  this subagent. The primary should run the exact commands after stopping that preview
  instance.

## Budgets and diff hygiene

- `lighthouse.config.mjs` still has `accessibility: 0.95`, `performance: 0.95` (plus the
  existing seo/best-practices entries); `tests/e2e/performance.spec.ts` still has exactly
  `test.describe.configure({ retries: 1 })`. Neither file was edited.
- `git diff --stat 740a580... HEAD` lists only the four Phase 4 test files. No runtime code,
  config, thresholds, recipes, GLBs, posters, MDX, package files, secrets, production data,
  or unrelated features were changed.
- No manual or visual browser pass, screenshots, or hand-driven browser interaction were
  performed by this subagent; only automated Playwright runs were used.

## Primary verification

- The stale preview process on port 4322 (PID 29820) was stopped. `git diff --check` passed, and `git diff --name-only 740a580...HEAD` matched the four Phase 4 test files exactly; no runtime, asset, config, threshold, secret, deploy, or production-data files changed.
- The exact chain `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e && pnpm test:a11y` was run by the primary. Every layer through smoke passed: lint had only the five pre-existing warnings; format/typecheck/build passed; 23 unit files / 242 tests; coverage gate; 7 integration files / 90 tests; 2 smoke tests.
- Default 8-worker E2E repeatedly hit the documented CPU-contention Lighthouse flake and the known unrelated mobile-tutor hydration flake. No threshold, retry, config, or test expectation was changed. Focused Lighthouse and mobile-tutor reruns passed.
- The complete E2E suite was then run serially with `pnpm exec playwright test --workers=1`: exit 0, 70 passed, 1 external-origin test skipped. All 18 new viewport tests passed. Lighthouse scores were catalog 100/96/100/100, Heart 100/96/95/100, and Earth 100/96/95/100.
- `pnpm test:a11y` then passed 7/7, exit 0, including Earth axe, reduced-motion, guidance, keyboard, and console checks.
- Phase 3 primary browser evidence remains applicable because Phase 4 changed tests only. A fresh primary browser pass is still required at review and after any fix round.

## Status

Verified by the primary after closing the subagent's permission/environment blockers. The default parallel run's contention flakes are recorded above; the serial full E2E suite and all configured static/unit/integration/smoke/a11y layers pass with unchanged budgets and retries.
