# Review: Implement a sticky tutor dock with reliable hotspot-grounded answers

- **Track:** `20261126-tutor-grounding-dock`
- **Type:** `feature`
- **Branch:** `feat/20261126-tutor-grounding-dock`
- **Range:** `31002092862d9477c5ed53393121fdf1ce3dc967..0e91d0b`
- **Date:** `2026-11-26T15:07:52+11:00`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The three phases implement hotspot-scoped retrieval, a shared allowed-ID citation gate, MDX-derived chunks for both authored lessons, and a dock that stays reachable from 1024px with a collapsible mobile sheet. The reviewer independently confirmed content-derived deterministic chunk IDs and that the lesson-page gutter CSS is scoped to that page. One Medium finding remains: error/no-context events now carry `scopeLabel`, and the dock renders a "Grounded in …" claim even when no answer was produced. It is objective and local, so it is being fixed in Phase R1.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass | `verification/integrated.md` |
| coverage | `pnpm coverage` | pass (80% gate met; retrieval.ts 100% lines) | `verification/integrated.md` |
| lint | `pnpm lint` | pass (six pre-existing warnings) | `verification/integrated.md` |
| typecheck | `pnpm typecheck` | pass | `verification/integrated.md` |
| build | `pnpm build` | pass | `verification/integrated.md` |
| integration | `pnpm test:integration` | pass (7 files / 72 tests) | `verification/integrated.md` |
| smoke | `pnpm smoke` | pass (2 tests) | `verification/integrated.md` |
| e2e | `pnpm test:e2e` | pass (43 passed, 1 skipped external-origin test) | `verification/integrated.md` |
| browser | in-app browser: mobile open/Escape/focus; 1280×800 and 1024×768 iframes, scroll and chip refocus | pass | `verification/browser.md` |

The full chain `pnpm verify && pnpm smoke && pnpm test:e2e` exited 0 on the third attempt. Two earlier attempts hit the known `oxfmt` exit-5 flake after printing "All matched files use the correct format."; a direct `pnpm exec oxfmt --check .` exited 0 and no thresholds or config were changed.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P2.T1 | `tests/unit/retrieval.test.ts` | covered |
| FR-2 | P2.T1 | `tests/unit/retrieval.test.ts` | covered |
| FR-3 | P2.T2 | `tests/integration/tutor.test.ts` | covered |
| FR-4 | P3.T1 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| FR-5 | P3.T2 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| FR-6 | P3.T3 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| FR-7 | P1.T1, P1.T2 | `tests/unit/retrieval.test.ts`, `scripts/generate-lesson-chunks.ts` | covered |
| FR-8 | P2.T3 | `tests/integration/tutor.test.ts` | covered (F1 UX defect on error label) |
| FR-9 | P3.T3 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| NFR-1 | all phases | `verification/integrated.md` | covered |
| NFR-2 | P3.T2 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| NFR-3 | P3.T2 | `tests/e2e/tutor.spec.ts` | covered |
| NFR-4 | P2.T1–T3 | unit/integration tests with mocked LLM | covered |
| NFR-5 | P3.T1–T4 | Lighthouse budgets unchanged, all met | covered |
| NFR-6 | P1.T1 | `tests/unit/retrieval.test.ts` | covered |
| AC-1 | P2.T1 | `tests/unit/retrieval.test.ts` | covered |
| AC-2 | P2.T1 | `tests/unit/retrieval.test.ts` | covered |
| AC-3 | P2.T2 | `tests/integration/tutor.test.ts` | covered |
| AC-4 | P3.T1 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| AC-5 | P3.T2 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| AC-6 | P3.T3 | `tests/e2e/tutor.spec.ts`, `verification/browser.md` | covered |
| AC-7 | P1.T2 | `tests/unit/retrieval.test.ts` | covered |
| AC-8 | P2.T3 | `tests/integration/tutor.test.ts` | covered |
| AC-9 | all phases | `verification/integrated.md` | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Grounding claim shown on error/no-context responses**
  - **File:** `src/components/tutor/TutorDock.tsx:94` (render at `:216`)
  - **What:** `handleEvent` sets `answerScope` from `event.scopeLabel` on error events; `api/src/routes/tutor.ts:89` emits `scopeLabel` on every error. The answer region renders "Grounded in …" independently of whether an answer exists, so quota, unavailable, invalid-citation and no-context paths show an inaccurate grounding claim above the error.
  - **Why:** Misleading failure state that contradicts the course-grounded promise; introduced by this diff.
  - **Fix:** Do not set `answerScope` on error events (or render the label only when an answer exists); add an assertion that no grounding label appears on an error path.
  - **Requirement:** FR-8
  - **Test gap:** E2E assertion that the error state has no `[data-testid=tutor-scope]` element.

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All three phases have `Result`, `Checkpoint` and `Evidence`; every `[x]` task is implemented with no silent drops. The final diff matches the phases' `Touches` plus one reported deviation (`src/lib/tutor-client.ts`, one `scopeLabel?: string` field). No generated files, lockfiles, config, thresholds, secrets or deploy changes outside the excluded artifacts.

## Out of scope

Generated `api/src/data/lesson-chunks.ts`, lockfiles, vendored code and Conductor prose were excluded from code findings. Reviewer confirmed no cross-page CSS regression from the lesson-page gutter rule.

## Debt

- <none>

## Doc sync

`pending` at review time; the pre-review sync added one dated note to `conductor/tech-stack.md`. The post-review sync will confirm no further doc change.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 | 0 (Phase R1 queued) |
