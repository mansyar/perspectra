# Phase 2 Verification — Hotspot-scoped retrieval and citation gate

- Track: `20261126-tutor-grounding-dock` (Implement a sticky tutor dock with reliable hotspot-grounded answers)
- Phase: 2 — Hotspot-scoped retrieval and citation gate
- Date: 2026-11-26
- Branch: `feat/20261126-tutor-grounding-dock`
- Base commit: `36f566c9641d93fddef5bfe86baa8498d4c961a5`
- Head commit at verification: `afae0c2` (`test(tutor): cover hotspot grounding and failure paths`)
- Result: verified

## Commands

Verification command, run exactly as specified:

`pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Lint | `pnpm lint` | 0 | `oxlint .` found no errors. Six pre-existing warnings only: one `no-shadow` in `tests/integration/worker-assets.test.ts` and five `unicorn/prefer-add-event-listener` in `src/lib/offline-queue.ts`. No warnings in files touched by this phase. |
| Format | `pnpm fmt:check` | 0 | `oxfmt --check .`: "All matched files use the correct format." (113 files). |
| Types | `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` completed with no diagnostics. |
| Build | `pnpm build` | 0 | `astro build` completed; static routes include `/`, `/sign-in`, `/verify`, `/lessons/heart`, `/lessons/earth-interior`. Only the pre-existing >500 kB chunk-size warning. |
| Unit tests | `pnpm test` | 0 | Vitest 5.1.1: 22 test files passed, 221 tests passed. |
| Coverage | `pnpm coverage` | 0 | 22 files / 221 tests passed. Statements 98.69% (377/382), branches 93.02% (200/215), functions 98.01% (99/101), lines 99.16% (355/358). `api/src/lib/retrieval.ts`: 100% statements, 96.36% branches, 100% functions, 100% lines — per-file thresholds met. |
| Integration | `pnpm test:integration` | 0 | Vitest integration config: 7 test files passed, 72 tests passed. |

Several intermediate runs failed before the final green run: lint flagged an unused `otherResult` local in `tests/unit/prompt.test.ts`; `fmt:check` rejected an overlong `post` call in `tests/integration/tutor.test.ts`, and on another attempt printed "All matched files use the correct format." while `oxfmt` exited 5 (the known flake, rerun once); one integration run failed the quota-label test because its first two requests used different session IDs. Each cause was fixed in code/tests only and the full command was rerun. The final run above passed end to end; no code changed after it.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Active hotspot restricts retrieval to that hotspot's chunks. | `scopeChunks(chunks, activeHotspot)` filters exact `hotspotId` matches before `retrieveChunks`; the tutor route ranks only `scope.chunks`. Unit test asserts only `aorta` IDs are returned for `activeHotspot='aorta'`; integration test asserts every returned citation ID belongs to `aorta`. | Verified |
| FR-2 | No hotspot means lesson-wide with a displayed label; a focus with no chunks yields `no_context` plus the static excerpt. | `scopeChunks(..., null)` returns all chunks with `WHOLE_LESSON_SCOPE` ('Whole lesson') surfaced as `scopeLabel` on SSE done/error events; `missingFocus` short-circuits to `no_context` through the shared `fail()` helper carrying `staticExcerpt`. Unit and integration tests cover null focus, humanized focus labels, and unknown hotspot with static excerpt. UI rendering of the label is Phase 3. | Verified |
| FR-3 | Citations outside the scoped set are rejected before any delta. | `citationScope(retrieved)` derives the allowed-ID set from the same ranked scoped result used to build the prompt; `validateCitations` runs on the complete answer before `deltaEvents`. Integration test with a mocked LLM citing `heart:mitral_valve:overview` while focused on `aorta` returns `invalid_citation` with zero delta events. | Verified |
| FR-8 | Quota, off-topic, no-context, invalid-citation and unavailable paths keep prose usable with error + static excerpt. | All route failure paths use one `fail()` helper that emits `staticExcerpt` and `scopeLabel`; integration tests assert error code, label, non-empty excerpt and absence of grounded deltas for each path. | Verified |
| NFR-4 | Deterministic mocked-LLM tests; embedding failure degrades to lexical ranking. | All tutor integration tests inject a stubbed `LlmPort`; `embed` can be made to reject, and the route catches that rejection to an empty embedding vector so lexical ranking still produces citations. No credentials or thresholds changed. | Verified |
| AC-1 | Unit: `activeHotspot='aorta'` returns only `aorta` chunks. | `tests/unit/retrieval.test.ts` `describe('scopeChunks')` asserts exact ID sets for a focused hotspot. Passed in the 22/221 unit run. | Verified |
| AC-2 | Unit: null hotspot yields lesson-wide chunks; unknown hotspot yields `no_context` + static excerpt. | Same unit block asserts all chunks and `WHOLE_LESSON_SCOPE` for null focus; integration test asserts `no_context`, `scopeLabel: 'Aorta'` and a non-empty `staticExcerpt` for an unknown hotspot. | Verified |
| AC-3 | Integration: mocked LLM citing another hotspot's chunk yields `invalid_citation` and zero deltas. | `tests/integration/tutor.test.ts` cross-hotspot test asserts `{ code: 'invalid_citation', scopeLabel: 'Aorta' }`, no `delta` events and prose in the excerpt. | Verified |
| AC-8 | Integration: quota, unavailable LLM and no-context paths return error + static excerpt. | Integration tests cover quota denial (shared session ID), a route constructed without an LLM, and an unknown hotspot; each asserts an error event with prose and scope label. | Verified |

## Evidence paths

- `api/src/lib/retrieval.ts` — `scopeChunks`, `ScopedChunks`, `WHOLE_LESSON_SCOPE`, `hotspotLabel`.
- `api/src/lib/prompt.ts` — `citationScope` used for the allowed-ID list in `assemblePrompt`.
- `api/src/routes/tutor.ts` — scoped retrieval, prompt/validation ordering, `scopeLabel` on SSE events, unified `fail()` with static excerpt.
- `tests/unit/retrieval.test.ts` — focused/null/missing hotspot scoping tests.
- `tests/unit/prompt.test.ts` — citation-scope allowlist tests.
- `tests/integration/tutor.test.ts` — mocked-LLM grounding, citation gate, fallback and failure-path tests.
- Harness shell output for the final verification run (layers and counts quoted above).

## Deviations

None. All changes are confined to the phase Touches.

## Notes

- The allowed citation set and the prompt's "Allowed chunk IDs" come from the same `scopeChunks` → `retrieveChunks` result, so prompt and validator cannot disagree about scope.
- An embedding failure is caught locally in the route and degrades to lexical ranking; no embedding threshold or credential changed.
- `scopeLabel` is an API-only SSE addition in this phase; `src/lib/tutor-client.ts` and `src/components/tutor/TutorDock.tsx` remain Phase 3 Touches and were not edited.
- Task commits: `49976c8` (P2.T1), `b8dad9f` (P2.T2, includes the tutor route wiring), `afae0c2` (P2.T3). This evidence file is left uncommitted for the primary state commit and does not change the verified code state.
- `git diff --name-only 36f566c..HEAD` lists only the six files in the phase Touches; no plan, spec, metadata, tracks or product documents were changed.

## Primary verification

I independently reran the full verification chain on the branch after the subagent report:

`pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`

- First attempt: exit 5 at `pnpm fmt:check` — `oxfmt --check .` printed "All matched files use the correct format." for 113 files and then `[ELIFECYCLE] Command failed with exit code 5.` This is the known oxfmt exit-5 flake, not a formatting defect.
- Second attempt: exit 0 for the entire chain. Lint reported only the six pre-existing warnings in `src/lib/offline-queue.ts` and `tests/integration/worker-assets.test.ts`; format, typecheck and build were clean; unit tests passed 22 files / 221 tests; coverage met the configured gate; integration tests passed 7 files / 72 tests.

`git status --porcelain` showed only the uncommitted evidence file, and `git diff --name-only 36f566c..HEAD` matched the six reported files in Touches exactly. AC-1, AC-2, AC-3 and AC-8 have corresponding unit/integration tests and the reported evidence above. Phase 2 accepted.
