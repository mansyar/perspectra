## Summary

This chore makes the Showcase MVP trustworthy as a portfolio artifact: pull requests now run a two-job verification workflow, database scripts are real and idempotent, deployment is documented and checkable, stale runtime state is cleared, and the badge credential narrative is correct for any lesson topic. No live deployment, secrets, domain purchase, or product feature was added.

## Track

- **ID:** `20261124-release-readiness`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261124-release-readiness/spec.md`](conductor/archive/20261124-release-readiness/spec.md)
- **Plan:** [`conductor/archive/20261124-release-readiness/plan.md`](conductor/archive/20261124-release-readiness/plan.md)
- **Review:** [`conductor/archive/20261124-release-readiness/review.md`](conductor/archive/20261124-release-readiness/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: PR Verification Workflow | Add PR-only CI with `verify` and `e2e` jobs plus a local contract checker | verified | `a072545` | Live GitHub Actions dry run remains human-only; local job chain and contract tests pass |
| 2: Real Database Scripts | Replace placeholder DB scripts with drizzle-kit and a guarded `tsx` seed CLI | verified | `b45ef3f` | `tsx@4.23.15` is the only new dev dependency |
| 3: Deploy Configuration, Docs and Workspace Cleanup | Add KV placeholder validation, deployment runbook, correct workflow note and RM-5 link; delete stale runs | verified | `481eedc` | Primary closed two permission-denied follow-ups |
| 4: Generic Badge Narrative | Derive badge narrative from lesson vocabulary and count | verified | `31456fc` | Primary browser pass on `/verify/` confirmed non-heart wording |
| 5: Integrated Verification and Proof | Record full verification and secret/placeholder audit | verified | `8e0fbf0` | `pnpm verify:full` exit 0; zero findings |

## Requirements

- [x] `FR-1` — PR-only CI with `verify` and `e2e` jobs (test: `tests/unit/ci-contract.test.ts`)
- [x] `FR-2` — real `db:push` / `db:seed` scripts (test: `tests/unit/db-scripts.test.ts`)
- [x] `FR-3` — KV placeholder validation (test: `tests/unit/config-check.test.ts`)
- [x] `FR-4` — deployment runbook (`docs/DEPLOYMENT.md`)
- [x] `FR-5` — workflow note and RM-5 link corrected
- [x] `FR-6` — stale runtime runs removed
- [x] `FR-7` — topic-agnostic badge narrative (tests: badge unit/integration)
- [x] `FR-8` — phase, integrated and browser evidence recorded
- [x] `NFR-1` — no secrets or real ids committed
- [x] `NFR-7` — all configured checks pass with 80% per-file coverage gate

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass (16 files / 133 tests) | `conductor/archive/20261124-release-readiness/verification/integrated.md` |
| coverage | `pnpm coverage` | pass (98.61% stmts / 92.41% branches / 99.12% lines) | same |
| lint | `pnpm lint` | pass (6 pre-existing warnings, 0 errors) | same |
| format | `pnpm fmt:check` | pass (89 files) | same |
| typecheck | `pnpm typecheck` | pass | same |
| build | `pnpm build` | pass (3 pages) | same |
| smoke/E2E | `pnpm smoke && pnpm test:e2e` | pass (1 + 17 tests) | same |
| full chain | `pnpm verify:full` | pass | same |
| browser | in-app browser on `/verify/` | pass | `conductor/archive/20261124-release-readiness/verification/browser.md` |

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 1 human-only limitation (AC-2 live GitHub Actions dry run)

## Deviations and risks

- `src/pages/verify.astro` gained a clearly labelled public offline fixture so the verifier narrative could be browser-verified without credentials; it is not a deployment secret and does not claim signature verification. It is documented in `review.md` and `verification/integrated.md`.
- Live GitHub Actions execution cannot be performed locally; the workflow contract is verified by unit tests and `pnpm check:ci`.
- Real KV namespace validation was tested with fake/override values; `pnpm check:config` was intentionally not run without a real id.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit d0d51d3
```

No migration or data rollback is required. The SQLite/Postgres schema was not changed by this track; only CI, scripts, docs, config validation and badge presentation changed.
