# Phase R1 Verification — Review Fixes (F1)

- Track: 20261126-tutor-grounding-dock
- Phase: R1 — Review Fixes (F1 / FR-8)
- Date: 2026-11-26
- Branch: feat/20261126-tutor-grounding-dock
- Base commit: 16a794979981c020986f35d759a9ce424f664313
- Head commit: 356a252eef023b48086758019a47a8c25e1dcfc1 (implementation head; evidence file left uncommitted for the primary state commit)
- Result: verified

## Phase range

`16a794979981c020986f35d759a9ce424f664313..356a252eef023b48086758019a47a8c25e1dcfc1`

## Task commits

| Task | Commit | Message |
| --- | --- | --- |
| R1.T1 (fix) | 5286aeb1134210495ff6d7a56a695445b0012ce7 | fix(tutor): suppress grounding label on error events |
| R1.T1 (test) | 356a252eef023b48086758019a47a8c25e1dcfc1 | test(tutor): assert no grounding label on error response |

## Change made

`src/components/tutor/TutorDock.tsx`: removed the single error-branch assignment `setAnswerScope(event.scopeLabel ?? null);` from `handleEvent`. `answerScope` is now set only in the successful `done` branch; `ask()` already resets it to `null` at the start of every request, so a failed turn can no longer leave or render a "Grounded in …" claim above an error. No other source file was changed; `api/src/routes/tutor.ts` and `src/lib/tutor-client.ts` are untouched by this phase.

## New test and assertion

`tests/e2e/tutor.spec.ts`: added an `ERROR_SSE` fixture — an SSE `error` event carrying `code: 'no_context'`, `message: 'No answer from this hotspot.'`, `scopeLabel: 'Aorta'` and a static excerpt — and a tagged `@tutor` test named "does not claim grounding on an error response that carries a scope label". The test overrides `**/api/tutor` with that fixture, asks a question, asserts the error message and excerpt remain visible in `tutor-answer`, then asserts `page.getByTestId('tutor-scope')` has count 0. The existing success-path assertion that `tutor-scope` contains "Aorta" after a chip click remains intact.

## F1 disposition

Fixed. An error/no-context response that includes a `scopeLabel` no longer renders the `[data-testid=tutor-scope]` "Grounded in …" element; the error message and static excerpt remain visible. The new E2E test covers the exact gap recorded in `review.md` F1. FR-8 and AC-8 error/static-excerpt behaviour is preserved.

## Commands

Exact verification command, run on the final tree:

```
pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e
```

- **Final exit code: 0**
- Lint: 0 (six pre-existing warnings: one `no-shadow`, five `prefer-add-event-listener`), unchanged by this phase.
- Format: 0 (`oxfmt --check .`: all matched files use the correct format, 113 files).
- Typecheck: 0 (`astro sync && tsc --noEmit`).
- Build: 0 (5 static pages built).
- Unit (`pnpm test`): 0 — 22 files, 221 tests passed.
- Coverage (`pnpm coverage`): 0 — 22 files, 221 tests passed; coverage summary all files 98.69% statements / 93.02% branches / 98.01% functions / 99.16% lines (gate met).
- Integration (`pnpm test:integration`): 0 — 7 files, 72 tests passed.
- Smoke (`pnpm smoke`): 0 — 2 tests passed.
- E2E (`pnpm test:e2e`): 0 — 44 passed, 1 skipped (production Earth, external origin). The new error-scope assertion passed. Lighthouse budgets met: `/` 1/0.96/1/1, `/lessons/heart/` 1/0.96/0.99/1, `/lessons/earth-interior/` 1/0.96/0.99/1.

## Deviations

None. Changes are confined to the two files in the phase Touches.

## Notes

- The known `pnpm fmt:check` / `oxfmt --check .` exit-5 flake occurred twice: once after an otherwise clean full-chain run (the direct `pnpm exec oxfmt --check .` also exited 5 while printing "All matched files use the correct format.") and once on a second chain attempt. Per the brief, it was confirmed directly and the full chain was rerun; the final run exited 0. No thresholds, config, secrets, deploy, data or behavior were changed to work around it.
- The first full-chain run also saw one Lighthouse `/lessons/heart/` budget check fail under contention and pass on automatic retry (43 passed, 1 flaky, 1 skipped); the final run passed it first time (44 passed, 1 skipped). No threshold changes.
- No browser verification was performed by this subagent, per the brief; the primary agent performs the required post-fix browser pass.
- Evidence file intentionally left uncommitted so the reported head commit remains the implementation head.

## Primary verification

- Independently confirmed `git diff --name-only 16a7949..HEAD` contains only `src/components/tutor/TutorDock.tsx` and `tests/e2e/tutor.spec.ts`; the source diff removes only the error-branch `setAnswerScope(event.scopeLabel ?? null);` line.
- Reran `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e`. First attempt exited 5 at the known `oxfmt` flake after "All matched files use the correct format."; `pnpm exec oxfmt --check .` exited 0 directly; rerun exited 0 end to end. Final counts: 22 unit files/221 tests, coverage gate met, 7 integration files/72 tests, 2 smoke tests, 44 E2E passed/1 skipped, all Lighthouse budgets met. No thresholds or config changed.
- Primary in-app browser pass after the fix: on the failed tutor request the error message and lesson prose remained visible and `[data-testid=tutor-scope]` count was 0. Evidence: `verification/browser.md`, section "Post-fix pass R1".
