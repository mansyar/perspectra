# Phase 3 verification — Guided stage and calm runtime

- Track: `20261127-scene-stage-reframing`
- Phase: 3 (base `55f7c37f364ed517325b6d3b7670fbd37be83cdb`)
- Branch: `feat/20261127-scene-stage-reframing`
- Status: verified (code + automated checks + primary browser pass)

## Task commits

| Task | Commit | Files |
| --- | --- | --- |
| P3.T1 | `bca32af` | `src/components/scene/SceneIsland.tsx`, `src/components/scene/scene.css` |
| P3.T2 | `9864af8` | `src/components/scene/framing.ts`, `src/components/scene/HeartScene.tsx` |
| P3.T3 | `a0d0519` | `src/components/scene/HeartScene.tsx`, `src/components/scene/scene.css` |
| P3.T4 | `3f51a5b` | `src/components/scene/HeartScene.tsx`, `src/components/scene/SceneIsland.tsx` |
| P3.T5 | `f65f940` | `tests/e2e/scene.spec.ts`, `tests/e2e/a11y.spec.ts` |

## Implementation notes

- **P3.T1:** Added a visible `.scene-island__guidance` paragraph (`#scene-guidance`) explaining that selecting a landmark or highlighted structure focuses the scene and that the lesson prose should be scrolled to read about each structure. It names no unsupported control (no drag/orbit/pinch). Both the start button and the hotspot group reference it via `aria-describedby`, so assistive technology reads the guidance with the scene controls; visible keyboard focus styling was preserved.
- **P3.T2:** Added `responsiveDistanceScale(fovDegrees, aspectRatio)` and `responsivePose(baseCamera, baseTarget, hotspot, fovDegrees, aspectRatio)` to `framing.ts`. They compute the square-viewport horizontal span at unit distance and, only on stages narrower than square, multiply the camera's offset from its target so that span is restored. The model scale is never changed, and wide stages reuse the Phase 2 tuned camera unchanged. `HeartScene` uses `responsivePose` for both animated and reduced-motion camera placement; WebGPU and WebGL share the same `HeartScene` frame logic, and the poster remains static.
- **P3.T3:** Removed the continuous group-scale `Math.sin` breathing. Camera easing was reduced to `CAMERA_EASE_RATE = 1.4`; particle speed/opacity/size were softened (`0.025 + (index % 5) * 0.005`, `0.6`, `0.024`). The flow remains a focus indicator, is hidden immediately for reduced motion, and the camera snaps to a static responsive pose in that mode. No orbit controls were introduced.
- **P3.T4:** The runtime builds an `AnimationMixer` for the loaded scene and creates `LoopOnce`/`clampWhenFinished` actions only for clips declared in the validated manifest (`manifest.animations.clips`, matched by `clip.name ?? clip.id`); hotspots without a declared clip get no action. `manifest.animations.triggers` maps active hotspots to clip ids with no lesson/hotspot branches in the runtime. The action plays on focus change, replays when focus leaves and returns, is stopped/reset on focus change or reduced motion, and the mixer is stopped and its root uncached on unmount. Clip duration normalization uses `action.timeScale = clip.duration === undefined ? 1 : action.getClip().duration / clip.duration` (three's `setDuration(0)` divides by zero). `SceneIsland` exposes `data-animation-clip` and an incrementing `data-animation-run` via the generic `onAnimation(clipId)` callback for deterministic state assertions.
- **P3.T5:** Kept hotspot/prose/tutor focus synchronization, the WebGPU → WebGL → poster ladder, poster opt-in, and named-mesh/hotspot contracts untouched. E2E now asserts guidance wording and `aria-describedby` association (rejecting drag/orbit/pinch/rotate/zoom hints), poster fallback when the GLB is unavailable, two-way hotspot↔prose focus, keyboard reachability, per-hotspot clip change and replay on return via the clip/run attributes, reduced-motion static binding, and renderer step-down/recovery. Both lessons are covered.

## Verification commands and results

All commands run individually from `D:\Projects\lms`; exit codes are from the actual runs. The primary will run the exact full chain end-to-end.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm lint` | 0 | Passed with five pre-existing warnings (four `prefer-add-event-listener` in `offline-queue.ts`, one `no-shadow` in `worker-assets.test.ts:54`); no new warnings. |
| `pnpm fmt:check` | 0 | `All matched files use the correct format.` (114 files). |
| `pnpm typecheck` | 0 | Passed (`astro sync && tsc --noEmit`). |
| `pnpm build` | 0 | 5 pages built; only the pre-existing chunk-size warning. |
| `pnpm test` | 0 | 23 files, 242 tests passed. |
| `pnpm coverage` | 0 | Thresholds met: statements 98.76%, branches 93.33%, functions 98.05%, lines 99.2%. |
| `pnpm test:integration` | n/a | Direct invocation was permission-denied for this subagent; `pnpm verify` (allowed) ran it internally: 7 files, 87 tests passed, exit 0. |
| `pnpm verify` | 0 | Full lint → fmt:check → typecheck → test → coverage → test:integration → build chain passed. |
| `pnpm smoke` | 0 | 2 passed (`@smoke`, both lessons). |
| `pnpm test:e2e` | 0 | 49 passed, 1 skipped (`@production-earth`); Lighthouse budgets unchanged and passing (home 1/0.96/1/1, heart 1/0.96/0.98/1, earth 1/0.96/0.97/1). |

`pnpm fmt` printed `All matched files use the correct format.` but exited 5 on one run (known oxfmt flake); `pnpm fmt:check` confirmed clean formatting. No config or threshold was changed.

One E2E run failed before the final fix: the clip replay test assumed no clip was active at scene-ready, but the prose binder preselects the first landmark on load (`left_ventricle_contract` / `crust_shift`, run 1). The test was changed to baseline-relative assertions (clip differs from initial, run increments, replay on return). Subsequent full E2E run passed with no failures.

## Deviations

None. All edits stayed inside the Phase 3 `Touches` list. No GLBs, images, recipes, lesson MDX, manifest schema, package/config files, Lighthouse thresholds, deployment files, or Conductor state outside this evidence file were modified.

## Subagent limitations (resolved by primary)

- `pnpm test:integration` — the exact command was not in the subagent's shell allowlist. `pnpm verify` ran the identical script internally (7 files, 87 tests passed), and the primary subsequently ran the exact full chain end-to-end with exit 0.

## Browser verification

Performed by the primary after the subagent report. See `verification/browser.md` for the viewport, clip-replay, fallback, and reduced-motion checks.

## Primary verification

- Base-to-head diff was inspected: the six changed files exactly match Phase 3 `Touches`; `git diff --check` passed. No deviation was reported or found.
- Exact full chain `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e` initially stopped at an unrelated mobile tutor sheet assertion (`.tutor__body` hidden). A focused rerun of that single test passed. The full chain was then rerun end-to-end and exited 0.
- Final chain results: lint passed with the same five pre-existing warnings; 23 unit files / 242 tests; coverage gate met; 7 integration files / 87 tests; 2 smoke tests; E2E 48 passed with one Lighthouse retry pass and one external-origin skip. Lighthouse remained within the existing budgets (catalog 100/96/100/100, Heart 100/96/99/100, Earth 100/96/98/100).
- Primary Playwright browser pass completed 8 checks across both lessons at 1280×800, 1024×768, and 390×844 plus reduced motion. Both lessons rendered WebGL after opt-in, guidance was visible and named no unsupported controls, canvas bounds stayed inside each viewport, hotspot clips changed and replayed on refocus, and reduced motion played zero clips with no page errors. Focused screenshots were visually inspected and showed unclipped Heart and Earth models at desktop and mobile widths.
- The in-app browser namespace was unavailable in this runtime, so the primary browser pass used the project's installed Playwright Chromium directly. This is explicitly recorded rather than claimed as an in-app pass.
