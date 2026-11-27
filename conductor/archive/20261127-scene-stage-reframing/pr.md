## Summary

Reframes both authored lesson stages so the 3D models are visibly larger while remaining safely inside desktop and mobile viewports. Adds accurate guided-control copy, removes idle model breathing, softens ambient motion, and plays brief manifest-driven hotspot animations with replay, interruption, reduced-motion, and poster fallback behavior.

## Track

- **ID:** `20261127-scene-stage-reframing`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261127-scene-stage-reframing/spec.md`](conductor/archive/20261127-scene-stage-reframing/spec.md)
- **Plan:** [`conductor/archive/20261127-scene-stage-reframing/plan.md`](conductor/archive/20261127-scene-stage-reframing/plan.md)
- **Review:** [`conductor/archive/20261127-scene-stage-reframing/review.md`](conductor/archive/20261127-scene-stage-reframing/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Scene contract and framing baseline | Add generic animation validation, aspect-aware framing, and measured Heart/Earth baselines | verified | `1888bc5` | No assets or runtime behavior changed in this phase |
| 2: Refine and regenerate lesson assets | Tighten cameras/posters, refine materials, export six one-shot clips per lesson, and regenerate outputs | verified | `e15e1be` | Blender recipes remain the source of truth; all GLB/poster budgets pass |
| 3: Guided stage and calm runtime | Add guidance, responsive camera framing, calmer motion, and manifest-driven clip playback | verified | `f65f940` | No free-orbit controls added; runtime stays topic-agnostic |
| 4: Viewport and renderer acceptance coverage | Expand GLB/content, viewport, accessibility, fallback, and performance coverage | verified | `8e28478` | Thresholds, retries, and configuration unchanged |
| R1: Review Fixes | Make optional animation contracts genuinely optional and partial-safe | verified | `024ad13` | Fixes review finding F1 with omitted/subset/invalid regression cases |

## Requirements

- [x] `FR-1` ΓÇö Larger, safely framed models for both authored lessons (`tests/integration/glb-manifest.test.ts`, `tests/e2e/scene.spec.ts`)
- [x] `FR-2` ΓÇö Accessible inline guidance for hotspot selection and prose scrolling (`tests/e2e/a11y.spec.ts`, `tests/e2e/scene.spec.ts`)
- [x] `FR-3` ΓÇö No idle model breathing; gentler camera and ambient motion (`src/components/scene/HeartScene.tsx`, `tests/e2e/scene.spec.ts`)
- [x] `FR-4` ΓÇö Optional manifest clips/triggers play briefly, interrupt cleanly, and replay on refocus (`src/lib/scene-manifest.ts`, `src/components/scene/HeartScene.tsx`, `tests/integration/*`, `tests/e2e/scene.spec.ts`)
- [x] `FR-5` ΓÇö Reduced-motion and poster modes stay static and complete (`tests/e2e/scene.spec.ts`, `verification/browser.md`)
- [x] `FR-6` ΓÇö Existing Heart/Earth assets, recipes, GLBs, and posters updated together (`assets/*/build_*.py`, `tests/integration/glb-manifest.test.ts`)
- [x] `FR-7` ΓÇö Guided hotspot/prose navigation remains authoritative (`tests/e2e/scene.spec.ts`, `tests/e2e/a11y.spec.ts`)
- [x] `FR-8` ΓÇö Stronger desktop presence and safe mobile framing (`tests/e2e/scene.spec.ts`, `verification/browser.md`)
- [x] `FR-9` ΓÇö WebGPU/WebGL/poster tiers preserve framing and fallback behavior (`tests/e2e/scene.spec.ts`, `tests/e2e/performance.spec.ts`)
- [x] `NFR-1` ΓÇö Runtime remains topic-agnostic and manifest/content-driven (`src/components/scene/HeartScene.tsx`, `tests/integration/content-contract.test.ts`, `tests/integration/glb-manifest.test.ts`)
- [x] `NFR-2` ΓÇö Keyboard focus, assistive guidance, and reduced motion preserved (`tests/e2e/a11y.spec.ts`)
- [x] `NFR-3` ΓÇö Lighthouse budgets, retry policy, catalog JS budget, and deferred scene loading unchanged (`tests/e2e/performance.spec.ts`, final diff)
- [x] `NFR-4` ΓÇö WebGPU ΓåÆ WebGL ΓåÆ poster fallback remains reliable (`tests/e2e/scene.spec.ts`)
- [x] `NFR-5` ΓÇö Reproducible, dependency-free asset updates (`assets/*/ASSET_CONTRACT.md`, `assets/*/build_*.py`)
- [x] `NFR-6` ΓÇö No secrets, deployment/config/data, domain, or threshold changes (final diff)
- [x] `NFR-7` ΓÇö Existing tokens/conventions reused; no unrelated UI refactor (`src/components/scene/scene.css`, `src/styles/lesson.css`)
- [x] `AC-1` ΓÇö Desktop model presence increased with safe bounds (`tests/integration/glb-manifest.test.ts`, `verification/browser.md`)
- [x] `AC-2` ΓÇö Mobile models/controls/prose fit safely at 390├ù844 (`tests/e2e/scene.spec.ts`, `verification/browser.md`)
- [x] `AC-3` ΓÇö Guidance is accurate and accessible without claiming orbit controls (`tests/e2e/a11y.spec.ts`)
- [x] `AC-4` ΓÇö Calm default motion plus interruptible/replayable hotspot clips (`tests/e2e/scene.spec.ts`)
- [x] `AC-5` ΓÇö Optional/partial animation contracts accepted; invalid references rejected (`tests/unit/manifest-schema.test.ts`, `tests/integration/content-contract.test.ts`, `tests/integration/glb-manifest.test.ts`)
- [x] `AC-6` ΓÇö Reduced-motion/poster/fallback modes remain complete (`tests/e2e/scene.spec.ts`, `verification/browser.md`)
- [x] `AC-7` ΓÇö Recipes regenerate committed assets within all budgets (`assets/*/build_*.py`, `verification/phase-2.md`)
- [x] `AC-8` ΓÇö Full verification and primary browser passes green (`verification/integrated.md`, `verification/browser.md`)
- [x] `AC-9` ΓÇö Final diff contains no prohibited or unrelated changes (final diff, `review.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint/format/types/build | configured chain | pass | `conductor/archive/20261127-scene-stage-reframing/verification/integrated.md` |
| unit/coverage | `pnpm test && pnpm coverage` | pass ΓÇö 242 tests | `verification/integrated.md` |
| integration | `pnpm test:integration` | pass ΓÇö 96 tests | `verification/integrated.md` |
| smoke | `pnpm smoke` | pass ΓÇö 2 tests | `verification/integrated.md` |
| E2E | `pnpm test:e2e` | pass ΓÇö 70 passed, 1 external-origin skip | `verification/integrated.md` |
| a11y | `pnpm test:a11y` | pass ΓÇö 7 tests | `verification/integrated.md` |
| browser | primary Playwright script | pass ΓÇö 8 checks | `verification/browser.md` |

Lighthouse: catalog `100/96/100/100`, Heart `100/96/99/100`, Earth `100/96/98/100`. Budgets and retries unchanged.

## Media

![Heart focused scene at 1280├ù800](https://github.com/user-attachments/assets/4cb6d65d-ad2f-4c03-b0d7-78b75f74fc03)

![Earth Interior focused scene at 1280├ù800](https://github.com/user-attachments/assets/b9ccd99b-e8da-44dc-983c-272dc36a87f9)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 1 finding
- **Accepted/deferred:** 0

## Deviations and risks

- No product-scope deviations. Phase 2 encountered repeated Blender binary byte differences despite passing every contract gate; final verification used the committed `e15e1be` outputs rather than uncommitted regenerated bytes.
- Verification encountered documented environment flakes (`oxfmt` false exit 5, stale preview lock, CPU-contention Lighthouse, unrelated mobile-tutor hydration). The exact final chain passed without changing thresholds, retries, configuration, or assertions.

## Follow-ups

- none

## Rollback

```bash
git revert --no-edit -m 1 <merge-commit>
```

No migrations, feature flags, production data operations, or deployment changes are included.

