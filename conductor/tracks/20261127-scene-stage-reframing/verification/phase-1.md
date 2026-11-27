# Phase 1 Verification — Scene Stage Reframing

**Track:** `20261127-scene-stage-reframing`
**Phase:** 1 (P1.T1 manifest animation contract, P1.T2 aspect-aware framing, P1.T3 baseline)
**Date:** 2026-11-27
**Branch:** `feat/20261127-scene-stage-reframing`
**Base:** `30a6d1b0794036d92c71c92389e44de45694fce1`
**Head:** `6694c06ac9fe88ebc3c941c9968dd9421304e8dc`
**Result:** All checks that could run under subagent shell permissions pass. Two required commands
were denied by the shell permission layer (the full `&&` chain and `pnpm test:integration`);
they are listed below and in the phase report blockers.

## Commands

| Command | Result | Exit code |
| --- | --- | --- |
| `pnpm lint` | Pass; 5 pre-existing warnings only (`offline-queue.ts` ×4, `worker-assets.test.ts` ×1) | 0 |
| `pnpm fmt:check` | Pass — "All matched files use the correct format." | 0 |
| `pnpm typecheck` | Pass (`astro sync` + `tsc --noEmit`) | 0 |
| `pnpm build` | Pass — 5 static pages built; pre-existing Vite chunk-size warning | 0 |
| `pnpm test` | Pass — 23 files, 242 tests | 0 |
| `pnpm coverage` | Pass — 242 tests; statements 98.76%, branches 93.33%, functions 98.05%, lines 99.2% | 0 |
| `pnpm test:integration` | **DENIED** — `Permission denied: shell` | n/a |
| `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration` | **DENIED** — shell forbids `&&` chains | n/a |
| `pnpm fmt` (diagnostic, not a required check) | Printed "Finished in 303ms on 114 files" then exited 5 (known oxfmt exit-code flake); `pnpm fmt:check` confirms formatting | 5 |

## Acceptance criteria

| Criterion | Phase-1 evidence | Status |
| --- | --- | --- |
| AC-5 — accept valid clips/triggers | `tests/unit/manifest-schema.test.ts` parses clips with optional `name`/`duration` and triggers referencing declared hotspots; `tests/integration/content-contract.test.ts` parses synthetic MDX frontmatter | Pass |
| AC-5 — reject invalid references | Unit tests cover unknown hotspot, unknown clip, duplicate clip IDs, duplicate triggers, malformed clip IDs and non-positive duration; content-contract tests reject invalid synthetic frontmatter | Pass |
| AC-5 — lessons without optional animations | `animations` is optional in `sceneManifestSchema`; unit and content-contract tests assert absence is accepted | Pass |
| AC-5 / NFR-1 — no new topic-specific runtime branch | Diff against base touches only `src/lib/scene-manifest.ts`, `src/components/scene/framing.ts` and tests; `HeartScene.tsx` unchanged; added schema/framing code is generic and content-driven | Pass (phase scope) |
| FR-8 / NFR-5 — aspect-aware framing groundwork | `VIEWPORT_ASPECTS`, `viewWidth`, `projectedBounds` added; baseline measured at 4:3, 1:1 and desktop ratios; no GLB/poster asset modified | Pass (phase scope) |
| FR-4 — animation playback | Manifest contract declared; renderer playback is a later phase and is not claimed here | Deferred by plan |

## Baseline

Machine-readable measurements: `.conductor/evidence/phase-1-baseline.json`.
All NDC values are **max absolute projected extent** over the eight model-bounds corners
(<= 1 means fully on screen). Ratios are view span / model span (`>= 1` means the model fits).
Framing uses the existing `FOCUS_TARGET_BLEND = 0.3` and `FOCUS_CAMERA_BLEND = 0.15`.

### Model bounds and poster files

| Lesson | Bounds min | Bounds max | Model height | Model width | Poster (MDX reference) | Resolved file |
| --- | --- | --- | --- | --- | --- | --- |
| Heart (basic) | `[-1.3700, -1.4900, -0.8000]` | `[1.3300, 2.0747, 0.7800]` | 3.5647 | 2.7000 | `/assets/heart/heart-poster.webp` | `public/assets/heart/heart-poster.webp` |
| Earth Interior | `[-1.0202, -1.0254, -1.0100]` | `[1.0074, 1.0254, 0.5795]` | 2.0508 | 2.0276 | `/assets/earth-interior/earth-poster.webp` | `public/assets/earth-interior/earth-poster.webp` |

### Base camera

| Lesson | Camera | Target | FOV | Camera–target distance |
| --- | --- | --- | --- | --- |
| Heart (basic) | `[0, 0.35, 7]` | `[0, 0.45, 0]` | 42° | 7.0007 |
| Earth Interior | `[4.2, 2.2, 4.8]` | `[0, 0, 0]` | 42° | 6.7469 |

### Rest and every hotspot focus pose

Columns show vertical NDC / horizontal NDC / view-to-model width ratio for each aspect;
the view-to-model height ratio is aspect-independent.

| Lesson | Pose | Focus camera | Focus target | Distance | H ratio | 4:3 V / H / W | 1:1 V / H / W | Desktop V / H / W |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Heart | rest (base camera) | `[0, 0.35, 7]` | `[0, 0.45, 0]` | 7.0007 | 1.5077 | 0.8113 / 0.4322 / 2.6541 | 0.8113 / 0.5763 / 1.9906 | 0.8113 / 0.3602 / 3.1850 |
| Heart | `left_ventricle` | `[-0.01575, 0.3905, 7]` | `[-0.105, 0.27, 0]` | 7.0016 | 1.5079 | 0.7558 / 0.4510 / 2.6545 | 0.7558 / 0.6014 / 1.9909 | 0.7558 / 0.3759 / 3.1854 |
| Heart | `right_ventricle` | `[0.02475, 0.39275, 6.9928]` | `[0.165, 0.285, -0.048]` | 7.0430 | 1.5169 | 0.7516 / 0.4818 / 2.6702 | 0.7516 / 0.6423 / 2.0026 | 0.7516 / 0.4015 / 3.2042 |
| Heart | `aorta` | `[0.00882, 0.46259, 7]` | `[0.0588, 0.7506, 0]` | 7.0061 | 1.5089 | 0.9384 / 0.4540 / 2.6562 | 0.9384 / 0.6054 / 1.9921 | 0.9384 / 0.3784 / 3.1874 |
| Heart | `pulmonary_artery` | `[0.03195, 0.450575, 6.99865]` | `[0.213, 0.6705, -0.009]` | 7.0134 | 1.5105 | 0.9087 / 0.4990 / 2.6590 | 0.9087 / 0.6653 / 1.9942 | 0.9087 / 0.4158 / 3.1908 |
| Heart | `mitral_valve` | `[-0.0171, 0.42065, 6.9991]` | `[-0.114, 0.471, -0.006]` | 7.0060 | 1.5089 | 0.8234 / 0.4526 / 2.6561 | 0.8234 / 0.6035 / 1.9921 | 0.8234 / 0.3772 / 3.1874 |
| Heart | `aortic_valve` | `[-0.009, 0.43595, 7]` | `[-0.06, 0.573, 0]` | 7.0015 | 1.5079 | 0.8642 / 0.4383 / 2.6545 | 0.8642 / 0.5844 / 1.9908 | 0.8642 / 0.3652 / 3.1853 |
| Earth Interior | rest (base camera) | `[4.2, 2.2, 4.8]` | `[0, 0, 0]` | 6.7469 | 2.5257 | 0.5725 / 0.4276 / 3.4062 | 0.5725 / 0.5701 / 2.5546 | 0.5725 / 0.3563 / 4.0874 |
| Earth Interior | `crust` | `[4.17525, 2.2396, 4.8324]` | `[-0.165, 0.264, 0.216]` | 6.6372 | 2.4847 | 0.6723 / 0.5095 / 3.3508 | 0.6723 / 0.6793 / 2.5131 | 0.6723 / 0.4245 / 4.0209 |
| Earth Interior | `upper_mantle` | `[4.2324, 2.2189, 4.8279]` | `[0.216, 0.126, 0.186]` | 6.4853 | 2.4278 | 0.5792 / 0.4113 / 3.2741 | 0.5792 / 0.5484 / 2.4556 | 0.5792 / 0.3427 / 3.9289 |
| Earth Interior | `lower_mantle` | `[4.1766, 2.1811, 4.8243]` | `[-0.156, -0.126, 0.162]` | 6.7699 | 2.5344 | 0.5305 / 0.5006 / 3.4178 | 0.5305 / 0.6675 / 2.5633 | 0.5305 / 0.4172 / 4.1013 |
| Earth Interior | `outer_core` | `[4.2072, 2.2009, 4.8108]` | `[0.048, 0.006, 0.072]` | 6.6763 | 2.4993 | 0.5623 / 0.4305 / 3.3705 | 0.5623 / 0.5740 / 2.5279 | 0.5623 / 0.3588 / 4.0446 |
| Earth Interior | `inner_core` | `[4.2, 2.2, 4.8063]` | `[0, 0, 0.042]` | 6.7215 | 2.5163 | 0.5682 / 0.4361 / 3.3934 | 0.5682 / 0.5815 / 2.5450 | 0.5682 / 0.3634 / 4.0720 |
| Earth Interior | `lithosphere` | `[4.1631, 2.2261, 4.8252]` | `[-0.246, 0.174, 0.168]` | 6.7336 | 2.5208 | 0.6502 / 0.5196 / 3.3994 | 0.6502 / 0.6928 / 2.5496 | 0.6502 / 0.4330 / 4.0793 |

All 14 poses have vertical and horizontal NDC <= 1 at all three ratios; the smallest height
ratio is 1.5077 (Heart), which preserves the whole-model margin. No GLB or poster asset was
modified.

## Evidence paths

- `.conductor/evidence/phase-1-baseline.json` — machine-readable baseline (camera, target, FOV,
  bounds, rest and per-hotspot focus poses, projected NDC and view/model ratios).
- `src/lib/scene-manifest.ts` — optional `animations` schema, clip/trigger types and generic validation.
- `src/components/scene/framing.ts` — `VIEWPORT_ASPECTS`, `viewWidth`, `projectedBounds`.
- `tests/unit/manifest-schema.test.ts`, `tests/unit/framing.test.ts`.
- `tests/integration/content-contract.test.ts`, `tests/integration/glb-manifest.test.ts`.
- Commits: `3660e96`, `e3fff4a`, `6694c06` (relative to base `30a6d1b`).

## Deviations

None. All source/test changes stay inside the phase `Touches` paths; the only extra file written
is the phase evidence file and the permitted `.conductor/evidence/` artifact.

## Notes

- The full verification chain cannot be executed by a subagent because shell forbids `&&`; each
  command was therefore run individually.
- `pnpm test:integration` is denied by the shell permission layer; the primary should run it and
  hand back the output. Unit tests exercise the same content-contract and GLB framing helpers.
- `pnpm fmt` exits 5 despite reporting success (known oxfmt flake); `pnpm fmt:check` passes.
- Baseline was measured with a temporary in-test measurement harness that wrote the JSON artifact;
  the harness was removed before the final test run (242 tests).
