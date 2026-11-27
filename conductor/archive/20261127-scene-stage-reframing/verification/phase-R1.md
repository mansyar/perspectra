# Phase R1 Evidence — Review Fixes

- **Track:** `20261127-scene-stage-reframing`
- **Branch:** `feat/20261127-scene-stage-reframing`
- **Phase base:** `af7d0c1b196a2846384d9ac76a9da5e48fed4ba6`
- **Final code head:** `024ad13`
- **Commit:** `465d887` — `test(scene): keep animation contracts optional and partial-safe`
- **Formatting commit:** `024ad13` — `style(scene): format animation contract tests`
- **Status:** verified by primary

## Findings disposition

### F1 — Optional animation metadata is mandatory in live-lesson contract tests

**Disposition: fixed in the two integration test contracts.** The shared live-lesson
assertions no longer require `animations` to exist, no longer require exactly six
clips, and no longer require a trigger for every hotspot. Declared metadata is still
validated strictly (unique clip IDs, resolved GLB animation names, positive declared
durations, hotspot-bound channels, valid/unique trigger references). Full six-clip and
trigger-bijection expectations are retained, explicitly and only, for the two authored
lessons (`heart`, `earth-interior`).

### R1.T1 — Keep animation test contracts optional and partial-safe

**Disposition: implementation done; verification not runnable in this subagent.**

## Exact changes

### `tests/integration/content-contract.test.ts`

- Added `FULL_ANIMATION_LESSONS` (`heart`, `earth-interior`) and a `lessonId(path)` helper.
- Reworked `validates optional animation metadata without requiring it` into
  `validates declared animation metadata without requiring it`: absent animations return
  cleanly; declared clips must be unique, have non-blank declared names and positive
  declared durations; declared triggers must reference declared hotspots/clips, one
  trigger per hotspot. No complete-coverage requirement remains.
- Reworked `declares one named, hotspot-triggered clip per landmark` into
  `declares one named clip per landmark when fully authored`: it returns immediately for
  lessons outside `FULL_ANIMATION_LESSONS` and keeps the original six-clip, named/duration,
  trigger-bijection assertions for `heart` and `earth-interior`.
- Added frontmatter regression case `accepts a valid subset of hotspot triggers` using a
  synthetic two-hotspot lesson that animates only the first hotspot.
- Left all unrelated content requirements intact (six unique hotspot IDs, six body
  sections, model/camera fields, build-time hotspot validation, duplicate/unknown/invalid
  frontmatter rejection).

### `tests/integration/glb-manifest.test.ts`

- `LessonAnimations.clips` now models `name` and `duration` as optional, matching the
  production schema (`scene-manifest.ts`).
- Added `parseDeclaredAnimations(block)` which reads clips/triggers from frontmatter with
  an indentation-aware parser that tolerates clips without `name`/`duration` (the runtime
  resolves the GLB name as `clip.name ?? clip.id`). Replaced the previous inline regex
  that silently dropped any clip lacking both fields.
- Added `validateDeclaredTriggers(hotspotIds, animations)` which is a no-op for absent
  animations and rejects unknown hotspot/clip references and duplicate triggers; it does
  not require full hotspot coverage.
- Reworked `exports each declared clip as a named, hotspot-bound GLB animation` into
  `exports declared clips as named, hotspot-bound GLB animations`: absent animations are
  valid; uniqueness of exported names, hotspot-mesh identity, channel/target bounds and
  hotspot binding are still checked; each declared clip must resolve to an exported GLB
  animation name (`name ?? id`) and have a positive declared duration; the strict six-clip
  bijection (no missing or undeclared ambient clips) is applied only to `heart` and
  `earth-interior`.
- Reworked `triggers every hotspot once and leaves no undeclared ambient clip` into
  `validates declared triggers without requiring full coverage`: calls
  `validateDeclaredTriggers`, and applies the original trigger bijection only to
  `heart`/`earth-interior`.
- Left all GLB contracts unrelated to F1 unchanged (size/draw-call budgets, poster,
  hotspot anchors, cameras/lights, rest and hotspot framing, responsive poses).

## Regression cases added

Content-contract (`frontmatter animation metadata`):
- `accepts a valid subset of hotspot triggers` — new.
- `accepts a lesson with no animations block` — existing, retained (omitted metadata).
- `rejects frontmatter animations with an unknown hotspot` — existing, retained (invalid
  declared trigger reference).
- `rejects frontmatter triggers that reference an undeclared clip` — existing, retained.
- Duplicate clips/triggers and non-positive duration rejection — existing, retained.

GLB contract (`declared animation validation`) — all new and deterministic, no assets or
network required:
- `parses clips with an omitted name and duration`.
- `accepts lessons without animation metadata`.
- `accepts a valid subset of hotspot triggers`.
- `rejects a trigger referencing an undeclared clip`.
- `rejects a trigger referencing an undeclared hotspot`.

## Primary verification

The exact configured chain was run by the primary:

```
pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e && pnpm test:a11y
```

Result: **PASS**, exit 0.

| Layer | Result |
| --- | --- |
| Lint | Pass; five pre-existing warnings only |
| Format | Pass; 114 files |
| Typecheck | Pass |
| Build | Pass; 5 pages |
| Unit/coverage | Pass; 23 files / 242 tests; coverage gate met |
| Integration | Pass; 7 files / 96 tests |
| Smoke | Pass; 2 tests |
| E2E | Pass; 70 tests, 1 external-origin skip |
| Accessibility | Pass; 7 tests |

Lighthouse remained within unchanged budgets: catalog `100/96/100/100`, Heart
`100/96/99/100`, Earth `100/96/98/100`.

Environment history recorded without weakening checks:

- The first chain found real formatting issues in the two edited test files. `pnpm fmt`
  fixed them and commit `024ad13` recorded the result.
- Several subsequent attempts hit the known false `oxfmt` exit-5 result after reporting
  all files formatted; a second direct `pnpm exec oxfmt --check .` exited 0. No config or
  threshold changed.
- One smoke attempt was blocked by a stale preview on port 4322. `pnpm preview stop`
  cleared it before the final run.
- The final chain passed end to end with no retries or expectation changes.

Mandatory post-fix browser verification also passed: `node .conductor/evidence/phase-3-browser.mjs`
returned `result: pass` with 8 checks. Both lessons passed at 1280×800, 1024×768 and 390×844,
including safe canvas bounds, poster opt-in, declared clip replay and zero animation runs
under reduced motion, with no page errors. The spawned preview was then stopped.

Static review performed: re-read every edited block; confirmed real Heart/Earth
frontmatter still parses to six named, timed clips and six triggers, so their strict
expectations remain active; confirmed synthetic subset/omitted/invalid cases follow the
production schema semantics; confirmed no edits outside the two allowed test files.

## Deviations

None. No source, asset, config, recipe, Conductor-state or browser-evidence file was
edited.

## Tree status

After commit `465d887`, `git show --stat` confirms only the two allowed test files changed
(210 insertions, 34 deletions). This evidence file is intentionally **not committed**;
the primary will include it in the acceptance commit.
