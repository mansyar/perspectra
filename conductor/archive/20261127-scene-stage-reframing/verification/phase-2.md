# Phase 2 verification — 20261127-scene-stage-reframing

## Status

All Phase 2 work is complete. Source edits, integration gates, and regenerated
GLB/PNG/WebP outputs are committed. Blender and `pnpm test:integration` were run by
the primary and the results handed back; the generated posters were inspected with
the read tool. No blockers remain.

## Commits

- `83ac91c` — `feat(assets): refine heart/earth recipes and tighten lesson framing`
  (P2.T1 + P2.T2 source: both recipes, both asset contracts, both lesson MDX files).
- `3dfe5bb` — `test(assets): gate named clips, triggers, and safe lesson framing`
  (P2.T3: both integration test files).
- `e15e1be` — `chore(assets): regenerate framed lesson GLBs and posters`
  (P2.T3: the six regenerated GLB/PNG/WebP outputs).

## P2.T1 — camera-first framing

Frontmatter cameras (also encoded as matching Blender poster cameras and in the
asset contracts):

| Lesson | Position | Target | FOV | Poster lens |
| --- | --- | --- | --- | --- |
| heart | `[0, 0.15, 6.9]` | `[0, 0.15, 0]` | 38° | 52.3 mm |
| earth-interior | `[4.2, 1.6, 3.6]` | `[0, -0.1, 0]` | 38° | 52.3 mm |

Measured against the Phase 1 GLB bounds (heart height 3.5647, earth height 2.0508)
with `framing.ts` maths (`FOCUS_TARGET_BLEND=0.3`, `FOCUS_CAMERA_BLEND=0.15`), all
14 rest/focus poses at 4:3, 1:1 and 1.6:1 aspects keep vertical and horizontal NDC
`<= 1`, and the minimum view-height/model-height stays at or above 1.2:

- heart: min height ratio `1.333`, max vertical NDC `0.960` (aorta focus at 4:3 is
  the binding constraint), max horizontal NDC `0.754`. Presence `0.75` vs the
  Phase 1 baseline `0.663`.
- earth: min height ratio `1.851`, max vertical NDC `0.870`, max horizontal NDC
  `0.930` (1:1 horizontal is the binding constraint). Presence `0.54` vs the
  Phase 1 baseline `0.396`.

Rejected alternatives: heart `[0, 0.35, 6.7]` / `[0, 0.2, 6.7]` with FOV 40–42
clipped (vertical NDC `1.007` on the aorta focus pose).

`tests/integration/glb-manifest.test.ts` now checks both viewport axes at all three
`VIEWPORT_ASPECTS`, at rest and for all six hotspot focus poses, and asserts that
presence improves over the Phase 1 baselines (`1.5077` heart, `2.5257` earth).

## P2.T2 — materials, lighting, and hotspot clips

Heart recipe (`assets/heart/build_heart.py`):

- Gentle apex taper on both ventricles, smoother sphere/torus tessellation, larger
  and more visible valve rings, richer myocardium/arterial/venous/valve colours.
- Workbench cavity shading and a darker cinematic background.
- Six named one-shot clips (24 fps, keys 1/7/13 = 0.5 s), each bound to exactly one
  named mesh: `LeftVentricleContract`, `RightVentricleContract`, `AorticArchPulse`,
  `PulmonaryFlow`, `MitralLeaflets`, `AorticValveLeaflets`.

Earth recipe (`assets/earth-interior/build_earth.py`):

- Stronger continent field contrast, deeper ocean/shelf tones, warmer and slightly
  brighter emissive core bands.
- The same one-shot clip timing for `CrustShift`, `UpperMantleFlow`,
  `LowerMantleFlow`, `OuterCoreConvection`, `InnerCorePulse`, `LithosphereDrift`.
- Both exporters now set `export_animations=True` and
  `export_animation_mode="ACTIONS"`, while keeping `export_cameras=False` and
  `export_lights=False`. No looping/ambient clips are authored.

`src/content/lessons/*.mdx` declare all 12 clips (`snake_case` IDs, GLB action
names, positive durations) with one trigger per hotspot. Both asset contracts were
updated from "no animations" to the named one-shot clip contract, the new camera
values, and the matching poster lens.

## P2.T3 — regeneration and gates

`tests/integration/glb-manifest.test.ts` additions:

- GLB size `< 1_000_000` bytes, `< 100` mesh nodes, six unique named hotspot nodes
  (existing gates, retained).
- Six exported animations with unique names matching every declared MDX clip,
  non-empty node-bound channels, and valid node indices.
- No exported cameras, `KHR_lights_punctual`, or camera nodes.
- Trigger coverage: one trigger per hotspot, no undeclared/ambient clip IDs.
- Poster `< 120_000` bytes and RIFF/WEBP magic (existing gate, retained).
- Framing on both axes at all three aspects for rest and every hotspot.

`tests/integration/content-contract.test.ts` additions:

- Every live lesson declares six unique named clips with positive durations, one
  trigger per declared hotspot, and a full bijection between triggered clips and
  declared clips.

### Regenerated outputs (primary-run, committed in `e15e1be`)

| File | Bytes | Budget |
| --- | --- | --- |
| `assets/heart/heart.glb` | 76,544 | < 1,000,000 — pass |
| `assets/earth-interior/earth.glb` | 938,088 | < 1,000,000 — pass |
| `public/assets/heart/heart-poster.png` | 953,472 | WebP source, committed |
| `public/assets/heart/heart-poster.webp` | 12,062 | < 120,000 — pass |
| `public/assets/earth-interior/earth-poster.png` | 961,185 | WebP source, committed |
| `public/assets/earth-interior/earth-poster.webp` | 16,334 | < 120,000 — pass |

`blender --background --python assets/heart/build_heart.py` and
`blender --background --python assets/earth-interior/build_earth.py` both exited 0,
exported the GLBs, saved the 960×960 PNG posters, and produced the WebPs through
Blender's native PNG→WebP path. `pnpm test:integration` exited 0 with 7 files /
87 tests passing against the regenerated assets, which confirms the GLB size,
six named hotspot meshes, named one-shot animation references and node-bound
channels, absent cameras/lights, RIFF/WEBP poster signature and size, MDX anchor
agreement, and safe framing on both axes at 4:3, 1:1 and 1.6:1 for rest and every
hotspot focus pose.

### Poster render observations

- Heart: the model now fills appreciably more of the 960×960 frame than the Phase 1
  poster; the tapered crimson left ventricle and muted purple right ventricle read
  as distinct chambers, with the red aortic arch and blue pulmonary artery fully
  visible against the dark navy background. No clipping, no washed-out highlights,
  and cavity shading adds definition along the chamber seam. The small valve rings
  remain partly occluded at rest because they sit between/behind the ventricles;
  their hotspot focus poses and one-shot clips are what clarify them.
- Earth: the cutaway globe is larger and centred, with no clipping at any edge.
  The thin grey lithosphere/crust rim, ochre mantle bands, red outer core, pale
  yellow inner core, and blue oceans with green land patches are all distinct and
  consistently lit; the darker background preserves silhouette contrast.

Both posters are visually consistent with the new in-app cameras and show clear
improvement over the Phase 1 framing without introducing clipping.

## Commands run locally

| Command | Exit | Notes |
| --- | --- | --- |
| `pnpm fmt:check` | 1 → 0 | First run flagged `glb-manifest.test.ts`; `pnpm fmt` fixed it; re-run clean (`All matched files use the correct format.`) |
| `pnpm lint` | 0 | Only five pre-existing warnings in `offline-queue.ts` and `worker-assets.test.ts` |
| `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` |
| `pnpm test` | 0 | 23 files, 242 tests passed |
| `pnpm build` | 0 | 5 static pages built (existing >500 kB chunk warning); re-run after generated outputs were committed, still exit 0 |
| `pnpm coverage` | 0 | 242 tests passed; statements 98.76%, branches 93.33%, functions 98.05%, lines 99.2% |
| `pnpm test:integration` | denied locally; 0 via primary | Phase shell rejected the subagent invocation; primary ran it against the regenerated assets: 7 files / 87 tests passed |
| `pnpm smoke`, `pnpm test:e2e` | not run | Brief rule 5: browser verification is primary-only |

Primary-run commands handed back to the phase agent:

| Command | Exit | Notes |
| --- | --- | --- |
| `blender --background --python assets/heart/build_heart.py` | 0 | Exported heart GLB (76,544 bytes) and 960×960 PNG; recipe generated the WebP (12,062 bytes) |
| `blender --background --python assets/earth-interior/build_earth.py` | 0 | Exported earth GLB (938,088 bytes) and 960×960 PNG; recipe generated the WebP (16,334 bytes) |
| `pnpm test:integration` | 0 | 7 files / 87 tests passed against regenerated assets and contracts |

The `pnpm fmt` run did not report the known oxfmt exit-5 flake in this phase.

## Blockers

None. The Blender regeneration and integration-test permission blockers were resolved
by the primary, the outputs were inspected and committed, and all permitted checks
passed.

## Deviations

None. All edits stayed inside the phase `Touches`. The evidence file is intentionally
left uncommitted for the primary state commit.

## Primary verification

The primary independently inspected the Phase 2 commit range and confirmed that all
14 changed files are inside `Touches`, with commits `83ac91c`, `3dfe5bb`, and
`e15e1be`. No generated file, recipe, MDX, contract, or config edit was unreported.

The primary reran both Blender commands successfully. A repeated exporter run changed
some binary bytes (GLB/PNG) despite passing the contract gates, so the committed
outputs from `e15e1be` were restored before the final test chain; the final tree was
verified against those exact committed assets. Their sizes remain Heart GLB 76,544
bytes / WebP 12,062 bytes and Earth GLB 938,088 bytes / WebP 16,334 bytes.

The combined remaining verification chain:

`pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e`

passed with exit 0. Results:

- lint: exit 0, five pre-existing warnings only.
- format: the first combined attempt hit the known `oxfmt` exit-5 flake after
  reporting all files formatted; direct `pnpm exec oxfmt --check .` exited 0, and
  the rerun passed without file edits or threshold changes.
- typecheck/build: exit 0; five pages built.
- unit/coverage: 23 files / 242 tests; coverage gate met.
- integration: 7 files / 87 tests.
- smoke: 2 passed.
- E2E: 44 passed / 1 skipped external-origin test.
- Lighthouse: catalog 100/96/100/100, Heart 100/96/99/100, Earth 100/96/99/100
  (accessibility / best practices / performance / SEO), all budgets met.

`git diff --check` passed and the only remaining working-tree change is this
untracked evidence file. Phase 2 is verified.
