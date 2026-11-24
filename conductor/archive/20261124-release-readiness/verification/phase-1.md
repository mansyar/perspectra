# Phase 1 Verification — PR Verification Workflow

- **Track:** `20261124-release-readiness`
- **Phase:** 1 — PR Verification Workflow
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-release-readiness`
- **Base commit:** `d2d7cec9fcdfba7750f43a6e7310a806b5b4152e`
- **Head commit (code):** `718a70505088c843cb58ede4deb13d29f8a5247b`
- **Result:** VERIFIED — `pnpm verify` exited 0, and the only outstanding CLI smoke check
  (`pnpm check:ci`) was run by the primary with exit 0 and the expected contract-OK output.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm lint` | 0 (within `verify`) | 6 pre-existing `unicorn` warnings in `offline-queue.ts` and `glb-manifest.test.ts`; none in new files. |
| static | `pnpm fmt:check` | 0 | 86 files clean. First attempt failed on the two new files; fixed with the allowlisted `pnpm fmt`, then clean. |
| static | `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` clean. |
| static | `pnpm build` | 0 | 3 static pages generated. |
| unit | `pnpm test` | 0 | 14 files, 117 tests (13 files / 103 tests before this phase; 14 new contract tests). |
| coverage | `pnpm coverage` | 0 | 98.6% statements, 91.7% branches, 97.84% functions, 99.11% lines; all 80% per-file gates met. |
| integration | `pnpm test:integration` | 0 | 5 files, 37 tests. |
| phase | `pnpm verify` | 0 | Exact verification command; full chain passed on the final code state. |
| checker CLI | `pnpm check:ci` | 0 (primary) | Primary closed the executor-shell denial: "CI workflow contract OK: pull_request trigger; jobs verify, e2e." |
| e2e (CI) | `pnpm smoke && pnpm test:e2e` | not run locally | No local Playwright Chromium binaries; the workflow installs them on the runner. |

## Primary follow-up check

The primary ran the exact command denied in the executor shell; no code change was needed:

```text
$ pnpm check:ci
$ node scripts/check-ci.mjs
CI workflow contract OK: pull_request trigger; jobs verify, e2e.
check_ci_exit=0
```

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | GitHub Actions on `pull_request` with `verify` and `e2e` jobs, pnpm/Node/Chromium setup and one flake retry | `.github/workflows/ci.yml`; `tests/unit/ci-contract.test.ts` | Met |
| AC-1 | Workflow file exists, triggers on `pull_request`, defines `verify` and `e2e` | `checkWorkflowText` / `checkWorkflowFile` in `scripts/check-ci.mjs`; 8 pass/fail contract tests | Met |
| AC-2 | Secret-free CI dry run installs deps + Chromium and executes both jobs with one documented retry | Workflow content assertions in `tests/unit/ci-contract.test.ts`; `pnpm verify` exit 0 | Partial — local config validated; a live GitHub Actions dry run cannot be executed from this environment |
| NFR-2 | CI needs no external services or credentials | No `env`/`secrets`/credential tokens in workflow; negative test asserts their absence | Met |
| NFR-3 | Retries limited to the two known flakes, never hide real failures | `verify` retries only on oxfmt "All matched files use the correct format" + exit-5; `e2e` only on `chrome.kill()` + `EPERM`/`EACCES`/`EBUSY`; non-matching failures exit with the original status; second-attempt failures propagate | Met |
| FR-8 | Phase evidence recorded | This file | Met |

## Evidence paths

- `.github/workflows/ci.yml` — `pull_request`-only workflow with exactly `verify` and `e2e`.
- `scripts/check-ci.mjs` — text-based contract checker and CLI entry point.
- `tests/unit/ci-contract.test.ts` — 8 checker pass/fail tests plus 6 workflow-content tests.
- `package.json` — `"check:ci": "node scripts/check-ci.mjs"`.
- Commits: `a3c39c2` (workflow), `f19851c` (checker + script), `718a705` (tests).

## Deviations

- None. All changed files are inside the phase `Touches`.

## Notes

- The `e2e` job adds a `pnpm build` step before the smoke/E2E chain because Playwright's
  `webServer` runs `astro preview`, which requires an existing `dist/` directory. The job still
  executes exactly `pnpm smoke && pnpm test:e2e` as specified.
- pnpm is pinned to `12.23.0` in `pnpm/action-setup@v4` to match `tech-stack.md`; Node is pinned to
  24 in `actions/setup-node@v4` with `cache: pnpm`.
- The checker parses the workflow as text (no YAML dependency), so it needs no new package and
  keeps the coverage/lockfile untouched.
- The oxfmt exit-5 flake was observed once while probing `pnpm fmt:check` before implementation
  ("All matched files use the correct format" with a nonzero exit) and cleared on rerun, matching
  the documented signature used by the retry logic.
- `pnpm check:ci` was denied in the executor shell as a newly added script; the primary ran the
  exact command with exit 0 and the expected output above, closing the only blocker. Checker logic
  is additionally exercised through `checkWorkflowFile()` in the passing unit tests.

## Primary verification

The primary independently ran the phase verification command from a clean tree after all
subagent commits. The diff from `d2d7cec..HEAD` contained only the phase `Touches`.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | Full chain passed: lint (6 pre-existing warnings, 0 errors), fmt:check (86 files), typecheck, 117 unit tests, 100% gated coverage (98.6% statements), 37 integration tests, 3-page build. |

Result: **VERIFIED**. Checkpoint: the squashed phase-1 commit recorded in `plan.md`.
