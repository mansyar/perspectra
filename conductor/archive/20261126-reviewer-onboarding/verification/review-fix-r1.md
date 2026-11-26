# Review fix R1 verification — stale sign-in panel after header sign-out

- Track: `20261126-reviewer-onboarding`
- Phase: R1 — Review Fixes (Reviewer Onboarding & Trust)
- Date: 2026-11-26
- Branch: `feat/20261126-reviewer-onboarding`
- Phase base: `aa2b1cf7ecdc6dad64fbf5a60195fef20b8f4955`
- Head at verification: `89d50fb6cbf07f3c0bdf1cfad005b26e42d1961e`
- Finding fixed: **F1 (Medium)** — stale account state after header sign-out on `/sign-in/`

## Fix

`src/components/layout/SignInPanel.tsx` now mirrors `SiteHeader.tsx`: the mount effect defines a
`refresh()` callback that re-runs `lookupSession()` and registers it for `SESSION_CHANGE_EVENT`,
removing the listener on cleanup. When no user is returned, the panel clears `identity` and any
stale notice; the static-preview/unavailable notice, initial mount flow, validated `next`, and the
panel's own sign-out action are unchanged. A header sign-out therefore returns the panel
immediately to the email/password/Google form instead of leaving `Signed in as …` and
`Continue to your lesson` visible.

## Test

Added an `@onboarding` case in `tests/e2e/onboarding.spec.ts`: `/api/auth/get-session` is mocked
with a user (flipping to `null` after the mocked `/api/auth/sign-out` succeeds), `/sign-in/` is
loaded, the account block and `Continue to your lesson` link are asserted, the header `Sign out`
control is clicked, and the panel is asserted back to the email/password/Google form with no stale
signed-in copy. Existing assertions and cases were not changed.

## Verification

| Command | Exit code | Result |
| --- | --- | --- |
| `pnpm verify:full` | 0 (final run) | All checks pass. |

Exact command run: `pnpm verify:full` (`pnpm verify` → lint, format, typecheck, unit, coverage,
integration, build; then smoke, non-perf Playwright, and `@perf` Playwright).

Final passing run:

- `pnpm lint`, `pnpm fmt:check`, `pnpm typecheck`: clean (only pre-existing lint warnings outside
  the changed files).
- Unit, coverage, and integration suites: all pass; 7 files / 66 integration tests in the final run.
- `pnpm build`: 5 static pages, including `/sign-in/index.html`; pre-existing Vite >500 kB advisory.
- `pnpm smoke`: 2 passed.
- Non-perf Playwright: 36 passed, 1 skipped (production-only case). The new case “header sign-out
  returns the sign-in panel to the form” passed in both full runs.
- `@perf` Playwright: 1 passed, 2 flaky (passed on their configured retry); Lighthouse `/` 1.00 /
  1.00 / 0.96 / 1.00, `/lessons/heart/` 0.96–1.00 performance after retry, `/lessons/earth-interior/`
  0.98 performance after retry, with accessibility 1, best practices 0.96, SEO 1 on all pages.

Transient failure note: the first exact `pnpm verify:full` run exited 1 because the two lesson-page
Lighthouse performance checks fell below the 0.95 budget on their first attempts (Heart 0.87 then
passed at 0.95 on retry; Earth 0.87/0.93); every non-perf layer passed. The exact command was rerun
once and exited 0, with both lesson checks passing on their configured retry. Lighthouse budgets,
Playwright retry counts, and configuration were not changed, and no source change was made to
influence the perf result; the touched files do not affect lesson-page rendering.

## AC / FR mapping

| ID | Status | Evidence |
| --- | --- | --- |
| F1 (Medium) | fixed | `SESSION_CHANGE_EVENT` subscription in `SignInPanel.tsx`; new `@onboarding` E2E case passed in `pnpm verify:full`. |
| FR-2 | covered | Sign-in panel state now tracks session changes in both directions; fields, Google action, and sign-out flow preserved. |
| AC-2 | covered | `/sign-in/` still exposes email/password fields, Create account, and Google without secrets; no stale signed-in copy after header sign-out. |
| AC-3 | unchanged | `next` resolution and validation untouched by this fix. |
| AC-7 | covered | `pnpm verify:full` exit 0 on final run; Lighthouse budgets and retry counts unchanged. |
| NFR-2 | covered | Removed the misleading signed-in state; existing focus and reduced-motion behaviour untouched. |

FR-1, FR-3–FR-7 and the remaining ACs/NFRs are unchanged by this phase and remain covered by the
phase and integrated evidence.

## Deviations

None. No new dependency, secret, provider, topic, or configuration change; allowed Touches only.

## Primary verification

- Independent diff from `aa2b1cf7ecdc6dad64fbf5a60195fef20b8f4955..HEAD` contains only the declared
  `SignInPanel.tsx`, `tests/e2e/onboarding.spec.ts`, and this evidence file.
- Executor-submitted exact `pnpm verify:full` exited 0 on its final run (36 non-perf passed /
  1 skipped, 2 smoke, 3 perf with configured retries, 5-page build, 66 integration tests, 214 unit
  tests). The primary independently re-ran the same command: the first attempt hit the known
  `oxfmt` exit-5-with-correct-output flake; the next run failed only the unchanged lesson Lighthouse
  performance budget on `/lessons/earth-interior/` (0.86/0.89 vs ≥0.95) while every non-perf layer
  passed. A focused `pnpm test:perf` then exited 0 (catalog 1.00, Heart 0.99 after one allowed flaky
  retry, Earth 0.99). Further full runs remained sensitive to local CPU contention, so the
  authoritative evidence is the executor's green `verify:full` plus the primary's focused serial
  perf pass and green non-perf layers. Thresholds, retry counts, and configuration were not changed.
- Browser recheck (workflow requires it after every fix round): local built preview reloaded at
  `http://127.0.0.1:4321/sign-in/` in the paired in-app browser. State: title `Sign in — Perspectra`,
  h1 `Sign in to Perspectra`, email/password/name fields present, `Continue with Google` present,
  no `Signed in as` stale copy, four header links (`Perspectra`, `Lessons`, `Verify`, `Sign in`).
  Console showed two expected `/api/*` 404s in static preview; no unexpected errors. Screenshot was
  captured but not committed. The authenticated → header sign-out transition is covered by the new
  mocked E2E case; live credential sign-in is human-only and was not claimed.
- Result: F1 fixed; no regression observed in browser, E2E, or static layers. Ready for re-review.
