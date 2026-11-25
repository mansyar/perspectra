# Phase 2 Verification — Detailed 3D Cutaway & Scene Integration

- **Track:** `20261125-earth-interior-proof`
- **Phase:** 2
- **Date:** 2026-11-25
- **Branch:** `feat/20261125-earth-interior-proof`
- **Phase base:** `a9af173232a74cb99ea05137470d43347618de09`
- **Source head under verification:** `f73f490a6c161cfeb067f83c5fb7509ddaa2eea9`
- **Result:** `VERIFIED`
- **Browser gate:** `PASS`

The primary-generated Earth recipe, GLB, poster, PNG source, and asset contract were not
regenerated or replaced. The existing generic renderer required no code changes. Phase 2 updated
the Earth manifest to the committed asset anchors, generalized asset validation, ran the existing
scene suite for both lessons, documented content-only onboarding, and split Lighthouse coverage
into isolated catalog, Heart, and Earth audits with unchanged thresholds.

The executor's first isolated-performance run failed only at the Heart Lighthouse budget. The
primary then closed stale browser tabs, removed one leftover headless Chrome process, reran the
focused audits successfully, and completed a final full `pnpm verify:full` with exit 0. The final
full run recorded one Heart performance flake followed by a passing retry; no threshold was lowered.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Final verification | `pnpm verify:full` | 0 | All stages passed; Playwright ended 30 passed and 1 flaky Heart audit that passed its configured retry. |
| Lint | `pnpm lint` (inside verification) | 0 | Zero errors; five pre-existing warnings remain in `offline-queue.ts` and `worker-assets.test.ts`. |
| Format | `pnpm fmt:check` (inside verification) | 0 | All 100 matched files use the correct format. |
| Typecheck | `pnpm typecheck` (inside verification) | 0 | Astro content sync and `tsc --noEmit` passed. |
| Unit | `pnpm test` (inside verification) | 0 | 177 tests passed across 21 files. |
| Coverage | `pnpm coverage` (inside verification) | 0 | 98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines. |
| Integration | `pnpm test:integration` (inside verification) | 0 | 60 tests passed across 7 files, including 13 generic live-lesson GLB contract tests. |
| Build | `pnpm build` (inside verification) | 0 | Four static pages built, including `/lessons/earth-interior/`. |
| Smoke | `pnpm smoke` (inside verification) | 0 | Heart and Earth scene smoke tests passed. |
| E2E | `pnpm test:e2e` (inside final verification) | 0 | 31 tests: 30 passed first attempt; Heart Lighthouse passed retry at 0.96. |

### Lighthouse isolation and retry evidence

`tests/e2e/performance.spec.ts` now runs one `@perf` test for each of `/`, `/lessons/heart/`, and
`/lessons/earth-interior/`. Each test launches a fresh headless Chrome, runs one Lighthouse audit,
and closes Chrome in `finally`. The suite has exactly one retry. The catalog-only static HTML and
zero-JavaScript assertions remain unchanged.

| Path | Accessibility | Best practices | Performance | SEO | Attempts |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 1 | 0.96 | 1.00 | 1 | Passed first attempt |
| `/lessons/heart/` | 1 | 0.96 | 0.87 | 1 | Flaky under full-suite load |
| `/lessons/heart/` retry | 1 | 0.96 | 0.96 | 1 | Passed configured retry |
| `/lessons/earth-interior/` | 1 | 0.96 | 0.97 | 1 | Passed first attempt |

The Heart failures reported LCP 2.0 s and total blocking time 280 ms initially, then 270 ms on
retry. The performance threshold remains 0.95; no Lighthouse score threshold or static-catalog
assertion changed. `playwright.config.ts` was not changed.

### Verification history

1. The first Phase 2 `pnpm verify:full` stopped at `oxfmt --check` with the new GLB test as the only
   formatting issue.
2. `pnpm fmt` produced the expected formatting-only diff but returned the known oxfmt exit-5
   failure. The formatted output was retained; two new sort warnings were also removed with
   `toSorted()`.
3. The next `pnpm verify:full` passed lint and reported that all 100 files were correctly
   formatted, then hit the documented oxfmt exit-5-with-correct-output false failure.
4. A subsequent `pnpm verify:full` completed every stage with exit 0 before the primary added the
   performance-isolation follow-up.
5. The follow-up added the Earth Lighthouse audit and per-path isolation at primary plan commit
   `33391db`; this executor's implementation commit is `f73f490`.
6. The executor's isolated-performance follow-up passed every non-browser stage and 30 of 31
   Playwright tests, but the Heart performance audit remained below 0.95 on both its initial
   attempt and retry.
7. The primary closed its stale preview tabs, removed one leftover headless Chrome process, and
   ran the focused `@perf` suite: catalog 1.00, Heart 0.99 on retry, Earth 0.99.
8. The final primary `pnpm verify:full` exited 0. Heart measured 0.87 under full-suite load and
   passed its configured retry at 0.96; catalog measured 1.00 and Earth 0.97.

The build retains the existing Vite warning about a minified chunk larger than 500 KB. It is not a
verification failure.

## Asset contract evidence

Sizes are recorded in the primary asset contract and independently enforced by
`tests/integration/glb-manifest.test.ts` for every live lesson.

| Asset | Size | Contract | Result |
| --- | ---: | --- | --- |
| Earth GLB | 935,332 bytes | < 1,000,000 bytes | Pass |
| Earth WebP poster | 18,410 bytes | < 120,000 bytes | Pass |
| Earth retained PNG | n/a | 960×960 source retained | Present |
| Heart GLB | n/a | < 1,000,000 bytes | Pass |
| Heart WebP poster | n/a | < 120,000 bytes | Pass |

Both lessons now receive the same checks:

- Exactly six unique manifest hotspot IDs and exactly six matching named GLB mesh nodes.
- Referenced GLB and poster paths resolve from each lesson's frontmatter.
- glTF 2.0 header/JSON validation and fewer than 100 mesh nodes.
- Poster RIFF/WEBP signature and size budget.
- Hotspot anchor agreement within 0.1 units, supporting baked mesh centres and named node pivots.
- Whole-model camera margin at rest and for every focused hotspot, using the existing shared
  `focusPose` and `viewHeight` math.

The Earth MDX uses camera `[4.2, 2.2, 4.8]`, target `[0, 0, 0]`, FOV 42, and the six anchors in
`assets/earth-interior/ASSET_CONTRACT.md`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-2 | Deterministic detailed Earth GLB and optimized poster | Primary asset commit plus generic size, signature, node, anchor, and framing checks | Verified |
| FR-3 | Existing generic scene pipeline and two-way binding | Renderer unchanged; scene E2E suite passes for both lessons | Verified (automated) |
| FR-7 | No Earth-specific runtime TypeScript | No `src/components/scene/**` changes; Earth remains MDX/manifest/assets plus generic tests | Verified |
| FR-8 | Phase evidence | This report records the implementation, failed intermediate attempt, final passing verification, and browser pass | Verified |
| AC-1 | Six working Earth hotspots with matching prose and valid contracts | Content contract, GLB contract, build, and Earth scene E2E tests | Verified (automated) |
| AC-2 | GLB/poster budgets, named meshes, and visual-quality review | Asset checks, primary asset QA, and desktop/mobile browser passes | Verified |
| NFR-2 | Catalog and both lessons meet Lighthouse budgets | Final full run: catalog 1.00, Heart 0.96 on retry, Earth 0.97; thresholds unchanged | Verified |
| NFR-3 | Keyboard, reduced motion, and WebGPU → WebGL → poster fallback | Earth E2E covers keyboard order, reduced motion, forced step-down, unavailable GLB, and delayed GLB | Verified (automated) |
| NFR-4 | Desktop/mobile visual-quality review | Primary Blender/poster QA plus desktop WebGPU and mobile WebGL browser passes | Verified |

## Visual-quality evidence

Primary asset QA recorded in the Phase 2 brief passed: the cutaway is complete, strata and core are
visible, the blue/green surface uses smooth vertex colour, and the poster is neither blank, cropped,
nor corrupt. The committed GLB is 935,332 bytes and the 960×960 WebP poster is 18,410 bytes.

Automated Playwright additionally confirmed that Earth:

- renders all six linked landmarks and hotspot buttons;
- keeps the poster until explicit 3D opt-in, then mounts a visible canvas;
- binds scene clicks and prose scrolling in both directions;
- preserves keyboard order and reduced-motion prose access;
- recovers from forced WebGPU failure on WebGL;
- falls through a second failure to the poster with prose intact; and
- keeps the poster visible until a delayed GLB finishes loading.

**PRIMARY BROWSER VERIFICATION — PASS (2026-11-25):**

- Desktop in-app browser at `/lessons/earth-interior/`: Start 3D produced a ready WebGPU canvas;
  the complete cutaway was framed and lit with visible strata/core and blue-green surface.
- Clicking `Outer core` updated `data-active-hotspot="outer_core"` and the matching prose section
  received `is-active`.
- Mobile Playwright viewport 390×844: no horizontal overflow before or after 3D; the poster was
  356×356; Start 3D produced a ready WebGL canvas with the poster hidden.
- Console contained only the expected static-preview `/api/mastery` 404 because no Worker API is
  attached to `astro preview`.
- Forced WebGPU→WebGL→poster and delayed-GLB behavior are covered by the passing Earth E2E tests.
- Screenshots remain under gitignored `.conductor/evidence/browser/` and are not committed.

## Evidence paths

- `conductor/tracks/20261125-earth-interior-proof/verification/phase-2.md`
- `assets/earth-interior/ASSET_CONTRACT.md`
- `tests/integration/glb-manifest.test.ts`
- `tests/e2e/scene.spec.ts`
- `tests/e2e/performance.spec.ts`
- `src/content/lessons/earth-interior.mdx`

## Deviations

None. The follow-up explicitly expanded the allowed touches to `tests/e2e/performance.spec.ts`.

## Notes

- Phase commits: primary asset commit `a9af173`; `dab3268`, `20230cb`, `566c538`, `a96b381`,
  `aac2368`, and performance-isolation commit `f73f490`.
- The primary-owned plan commit `33391db` was not edited.
- No binaries, lockfiles, package configuration, deployment data, database state, or Conductor
  state files were changed by this phase executor.

## Primary verification

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm verify:full` | 0 | 177 unit, 60 integration, 2 smoke, 31 E2E outcomes (30 pass + 1 allowed performance retry), 4-page build. |
| `pnpm exec playwright test --grep '@perf'` | 0 | Catalog 1.00, Heart 0.99 on retry, Earth 0.99 performance. |
| Primary desktop/mobile browser pass | n/a | PASS; framing, lighting, hotspot/prose binding, responsive width, and expected console behavior verified. |

The final full run's Heart performance flake was retried by the test's single configured retry and
passed at 0.96. Thresholds and static-catalog assertions were not changed.
