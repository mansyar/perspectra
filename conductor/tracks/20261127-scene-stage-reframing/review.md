# Review: Reframe the 3D stage with a larger model, interaction hints and calmer motion

- **Track:** `20261127-scene-stage-reframing`
- **Type:** `feature`
- **Branch:** `feat/20261127-scene-stage-reframing`
- **Range:** `b336abd1e5873de5153e76c800c922d37c7414e7..40e513a`
- **Date:** `2026-11-27T18:44:34+11:00`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The implementation delivers the approved scene-reframing scope: larger safe framing for both authored lessons, accurate guided-control copy, calmer motion, manifest-driven one-shot hotspot clips, reproducible asset updates, responsive viewport coverage, and preserved renderer/accessibility/performance contracts. One Medium finding remains in the integration test contract: optional animation metadata is still treated as mandatory by the live-lesson assertions.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint | `pnpm lint` | pass | `verification/integrated.md`; five pre-existing warnings only |
| format | `pnpm fmt:check` and direct `oxfmt --check` | pass | reviewer exit-5 flake resolved by primary direct check |
| typecheck | `pnpm typecheck` | pass | `verification/integrated.md` |
| build | `pnpm build` | pass | 5 pages |
| unit | `pnpm test` | pass | 23 files / 242 tests |
| coverage | `pnpm coverage` | pass | configured 80% gates met |
| integration | `pnpm test:integration` | pass | 7 files / 90 tests; primary rerun |
| smoke | `pnpm smoke` | pass | 2 tests |
| e2e | `pnpm exec playwright test --workers=1` | pass | 70 passed, 1 external-origin skip |
| a11y | `pnpm test:a11y` | pass | 7 tests |
| browser | primary Playwright script | pass | 8 checks in `verification/browser.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2, P2.T1, P3.T2 | framing unit/GLB integration; browser evidence | covered |
| FR-2 | P3.T1 | scene/a11y E2E; browser evidence | covered |
| FR-3 | P2.T2, P3.T3 | runtime diff; replay E2E; browser evidence | covered |
| FR-4 | P1.T1, P2.T2, P3.T4 | manifest/content/GLB/replay tests | covered |
| FR-5 | P3.T5 | reduced-motion/poster E2E; browser evidence | covered |
| FR-6 | P2.T1, P2.T2, P2.T3 | recipes, contracts, regenerated assets, integration tests | covered |
| FR-7 | P3.T1, P3.T5 | focus/keyboard/guidance E2E | covered |
| FR-8 | P1.T2, P2.T1, P3.T2 | framing unit/integration; viewport E2E | covered |
| FR-9 | P2.T1, P2.T3, P3.T5 | renderer fallback and asset contracts | covered |
| NFR-1 | P1.T1, P3.T4 | manifest/runtime tests | partial — F1 |
| NFR-2 | P3.T3, P3.T5, P4.T2 | reduced-motion and a11y tests | covered |
| NFR-3 | P3.T3, P4.T3 | unchanged config/thresholds; Lighthouse evidence | covered |
| NFR-4 | P3.T5, P4.T3 | fallback/console E2E | covered |
| NFR-5 | P2.T3, P4.T1 | deterministic recipes and asset contracts | covered |
| NFR-6 | P4.T3 | final diff inspection | covered |
| NFR-7 | P3.T1, P3.T3 | token/convention and final diff inspection | covered |
| AC-1 | P1.T2, P1.T3, P2.T1, P3.T2, P4.T1, P4.T2 | baseline/presence/bounds tests; viewport E2E | covered |
| AC-2 | P3.T2, P4.T2 | 390×844 E2E and browser evidence | covered |
| AC-3 | P3.T1, P4.T2 | guidance/keyboard/a11y tests | covered |
| AC-4 | P3.T3, P3.T4, P4.T2 | no-breathing diff; replay/interruption tests | covered |
| AC-5 | P1.T1, P3.T4, P4.T1 | manifest schema/content/GLB tests | covered |
| AC-6 | P3.T5, P4.T2, P4.T3 | reduced-motion/poster/fallback tests | covered |
| AC-7 | P2.T3, P4.T1 | Blender recipe runs and committed outputs | covered |
| AC-8 | P4.T2, P4.T3 | project checks, serial E2E, a11y, Lighthouse, browser evidence | covered |
| AC-9 | P4.T3 | final diff and repository/config inspection | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Optional animation metadata is mandatory in live-lesson contract tests**
  - **File:** `tests/integration/content-contract.test.ts:202-219`; repeated in `tests/integration/glb-manifest.test.ts:286-345`
  - **What:** The new live-lesson tests require every lesson to declare exactly six clips and a trigger for every hotspot, even though animations are optional and another test explicitly permits omission. The GLB test also requires animations and complete hotspot coverage.
  - **Why:** A valid static lesson or a lesson declaring only a subset of optional hotspot animations would fail the integration suite, violating FR-4 and NFR-1 backward compatibility.
  - **Fix:** Validate only declared clips/triggers for ordinary lessons; require valid references, unique IDs, positive durations, and declared-name GLB bindings. Apply strict full-coverage expectations only when explicitly authored, not as a global contract. Add regression coverage for omitted animations and a valid subset.
  - **Requirement:** FR-4, NFR-1
  - **Test gap:** Add a synthetic subset-trigger parser test and make both live-lesson animation assertions conditional/partial-safe.

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All four phases and fourteen implementation tasks are verified with Result, Checkpoint and Evidence. Changed files match plan Touches; the only additional runtime file was the planned generic manifest contract. No phase task was silently dropped. Phase R1 will address F1.

## Out of scope

No new finding belongs to another track. Deployment, credentials, production data, custom domains, new topics, orbit navigation, and threshold/config changes remain out of scope.

## Debt

- <none>

## Doc sync

`pending` — pre-review `tech-stack.md` sync is committed; post-review disposition will be finalized after R1.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 | 0 |
