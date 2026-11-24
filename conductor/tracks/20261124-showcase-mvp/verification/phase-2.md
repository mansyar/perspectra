# Phase 2 Verification — 3D Scene & Hotspot Binding

- Track: `20261124-showcase-mvp`
- Phase: 2 — 3D Scene & Hotspot Binding
- Date: 2026-11-24
- Branch: `feat/20261124-showcase-mvp`
- Base commit: `67ec1eb9de4de2eb9bfd3079de5dd93f2b52aca9`
- Head commit (implementation): `691c6945a105ed6b35ccc698237e8c26bd2171b8`

## Result

**VERIFIED** — `pnpm verify:full` exits 0: lint, format, typecheck, unit tests,
coverage, integration tests, build, smoke and all six E2E tests pass.

## Commands (final run)

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm lint` | PASS (2 pre-existing warnings) | `unicorn(no-array-sort)` in `tests/integration/glb-manifest.test.ts`; no errors |
| `pnpm fmt:check` | PASS | All matched files use the correct format |
| `pnpm typecheck` | PASS | `astro sync && tsc --noEmit` |
| `pnpm test` | PASS | 3 files, 21 tests |
| `pnpm coverage` | PASS | 100% statements/branches/functions/lines for `src/lib/scene-manifest.ts` |
| `pnpm test:integration` | PASS | 2 files, 8 tests, including GLB↔manifest contract |
| `pnpm build` | PASS | Static output; GLB emitted as `dist/_astro/heart.CH-813cy.glb` |
| `pnpm smoke` | PASS | 1 `@smoke` test passed |
| `pnpm test:e2e` | PASS | 6 passed, 0 failed |
| `pnpm verify:full` | PASS | exit code 0 |

## Acceptance criteria

| AC | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| AC-3 | Heart GLB renders as an R3F island with named-mesh→hotspot mapping, renderer fallback and heartbeat/particles | PASS | `src/components/scene/HeartScene.tsx`, `SceneIsland.tsx`, `renderer-support.ts`; GLB JSON chunk parsed by `tests/integration/glb-manifest.test.ts`; E2E render/fallback tests pass |
| AC-4 | Two-way hotspot↔prose binding via shared store, camera tween and emissive pulse | PASS | `src/lib/hotspot-store.ts`, `src/components/prose/ProseHotspotBinder.tsx`; E2E click→prose and scroll→active tests pass |
| AC-5 | Keyboard reachability, reduced motion, mobile-safe prose | PASS | DOM buttons in `SceneIsland.tsx`, `data-motion` attribute, `focusHotspot` smooth/auto scroll; keyboard and reduced-motion E2E tests pass |
| AC-19 | Committed GLB/poster contract, <1 MB, six mesh names equal manifest IDs | PASS | 8 integration tests pass; asset files verified, not regenerated |

## Evidence paths

- `src/components/scene/HeartScene.tsx`
- `src/components/scene/SceneIsland.tsx`
- `src/components/scene/renderer-support.ts`
- `src/components/scene/RendererErrorBoundary.tsx`
- `src/components/prose/ProseHotspotBinder.tsx`
- `src/lib/hotspot-store.ts`
- `src/pages/lessons/[slug].astro`
- `tests/unit/hotspot-store.test.ts`
- `tests/integration/glb-manifest.test.ts`
- `tests/e2e/scene.spec.ts`
- `playwright.config.ts`

## Commits

- `333b5cd` feat(scene): add shared hotspot store and asset contract checks
- `24fd3a8` feat(scene): mount R3F heart island with renderer fallback chain
- `219612a` test(e2e): add scene smoke and hotspot interaction specs
- `691c694` fix(scene): make prose hotspot selection deterministic

## Deviations

- `tsconfig.json` was adjusted with `typeRoots`/`paths` for React 19 types; the
  installed `@types/react` packages are present in the pnpm store but not linked
  at the top level, so bare `react` imports otherwise fail typecheck.
- `.oxfmtrc.json` now ignores `test-results/**`; Playwright recreates that folder
  on every run and its `.last-run.json` is not source code subject to formatting.
- Formatting was normalised to the project's 100-column oxfmt style.

## Notes

- Heart assets (`assets/heart/build_heart.py`, `heart.glb`, `ASSET_CONTRACT.md`,
  `public/assets/heart/heart-poster.png`, `src/content/lessons/heart.mdx`) were
  prepared before this phase and were only verified; **they were not regenerated
  or rewritten**.
- The catalog page remains zero-JS; only the lesson page mounts React islands.
- No tests were weakened or changed during the fix.

## Primary verification

- Primary installed Playwright Chromium, deleted the two scratch probe files and
  the earlier `test-results/` directory, then ran `pnpm verify:full`.
- That run passed everything through smoke and had 4 E2E passes with 2 failures:
  prose scroll did not activate `mitral_valve`, and the reduced-motion click did
  not keep `aortic_valve` active.
- Fix applied (implementation only): replaced the IntersectionObserver in
  `ProseHotspotBinder` with a frame-throttled scroll/resize listener that picks
  the landmark whose centre is closest to the viewport centre; added a short
  click-selection lock in `focusHotspot` so a clicked landmark stays active while
  its scroll settles; removed MDX-generated empty wrapper paragraphs at runtime
  so each landmark exposes exactly its three prose layers.
- First post-fix `pnpm verify:full` had 5 E2E passes; the reduced-motion test then
  exposed the pre-existing empty-paragraph count (9 instead of 3). After the
  paragraph normalization, the final `pnpm verify:full` passed all 6 E2E tests.
- `test-results/` is recreated by Playwright on each run; it is now ignored by
  oxfmt. It remains untracked and may be deleted by the primary if desired.
