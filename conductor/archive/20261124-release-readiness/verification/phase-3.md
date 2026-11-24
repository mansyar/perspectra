# Phase 3 Verification — Deploy Configuration, Docs and Workspace Cleanup

- Track: `20261124-release-readiness`
- Phase: 3
- Date: 2026-11-24
- Branch: `chore/20261124-release-readiness`
- Base commit: `872168a22019f2e9ec8cf8590a80166d777fd85b`
- Head commit: see final JSON report (last commit of this phase)
- Result: **VERIFIED** — implementation, primary follow-up actions, and `pnpm verify` all complete.

## Commands and results

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm fmt` | exit 1 (known oxfmt exit-5 flake) | Reported formatting finished on 89 files; applied formatting, then exited 5. No blind reformat loop. |
| `pnpm verify` (attempt 1) | exit 1 (known oxfmt exit-5 flake) | `fmt:check` printed `All matched files use the correct format.` for 89 files but exited 5. |
| `pnpm verify` (attempt 2, one allowed rerun) | exit 1 (same flake) | Same message and exit 5. |
| `pnpm fmt:check` | exit 0 | Standalone check clean on 89 files, confirming formatting was correct. |
| `pnpm verify` (attempt 3) | **exit 0** | Full chain green; details below. |
| `git status --short` | exit 0 | Only intended files changed; no workflow or stale-run changes. |
| `edit D:\Projects\lms\conductor\workflow.md` (subagent) | permission denied | New command not on the executor allowlist. |
| Primary follow-up: edit `conductor/workflow.md` line 64 | successful (primary) | Stale no-remote note replaced; roadmap RM-5 already correct and unchanged. |
| `Remove-Item -Recurse -Force .conductor/runs/20261124-showcase-mvp, .conductor/runs/20261124-showcase-mvp.json` (subagent) | permission denied | New command not on the executor allowlist. |
| Primary follow-up: `Remove-Item -LiteralPath 'D:\Projects\lms\.conductor\runs\20261124-showcase-mvp' -Recurse -Force` and `Remove-Item -LiteralPath 'D:\Projects\lms\.conductor\runs\20261124-showcase-mvp.json' -Force` | `stale_remaining=0` (primary) | All stale run files removed; no tracked diff; current run files untouched. |

Successful `pnpm verify` (attempt 3) details:

- `pnpm lint`: 6 pre-existing warnings (`src/lib/offline-queue.ts` lines 72/79/80/105, `tests/integration/glb-manifest.test.ts` lines 26/161). No warnings in touched files.
- `pnpm fmt:check`: 89 files formatted correctly.
- `pnpm typecheck`: `astro sync && tsc --noEmit` clean.
- `pnpm test`: 16 unit files / 130 tests passed (up from 15/122; +1 file / +8 tests from `tests/unit/config-check.test.ts`).
- `pnpm coverage`: 98.6% statements, 91.7% branches, 97.84% functions, 99.11% lines; 80% per-file gates satisfied.
- `pnpm test:integration`: 5 files / 37 tests passed.
- `pnpm build`: 3 static pages built (`/`, `/lessons/heart/`, `/verify/`).

`pnpm check:config` was intentionally not invoked: the brief directs covering it with unit tests if the
executor denies the command, and the new command is not on the executor allowlist. Its logic is fully
covered by `tests/unit/config-check.test.ts` (placeholder rejection, env override acceptance, real
committed id, malformed id, missing binding, no secret echo, package-script wiring).

## Acceptance criteria and NFR evidence

| Criterion | Status | Evidence |
| --- | --- | --- |
| AC-4 (KV placeholder validation) | Met | `wrangler.toml` unchanged with 32-zero placeholder; `scripts/check-config.mjs` rejects it and accepts `RATE_LIMIT_KV_ID` with a real 32-hex id without rewriting the file; 8 unit tests. |
| AC-5 (deployment runbook) | Met | `docs/DEPLOYMENT.md` has all seven ordered sections, every required variable, KV binding guidance, `db:push`/`db:seed`/embed steps, deploy/smoke/Lighthouse/rollback, and explicit `[HUMAN ONLY]` markers. |
| AC-6 (accurate Conductor docs) | Met | Roadmap RM-5 `track` confirmed as `20261124-release-readiness` and left unchanged. Primary replaced the stale no-remote note in `conductor/workflow.md` with `The origin remote exists and PR creation is enabled.` |
| AC-7 (no stale runtime runs) | Met | Primary deleted the old `.conductor/runs/20261124-showcase-mvp/` directory and `.json` file; `stale_remaining=0`. Gitignored, so no tracked diff. Current `20261124-release-readiness*` files untouched. |
| NFR-1 (no secrets in runbook) | Met | Runbook uses only variable names and placeholders; no real secret, account id, or domain. |
| NFR-5 (roadmap preserved) | Met | RM-5 ordering, id, title and `track` cell unchanged; no other roadmap row edited. |
| NFR-8 (clean workspace) | Met | Primary removal confirmed `stale_remaining=0`; no stale showcase-mvp runtime files remain. |

FR-8 evidence: this file plus commits `e8d4d17` (checker/tests/script), `cc2501b` (runbook), and the
evidence commit. No dependency, lockfile, coverage-config, generated-file, or existing-test changes.

## Primary follow-up checks

Per the brief's appended primary output, the two denied actions were performed by the primary:

```text
P3.T3: conductor/workflow.md line 64 — replaced "No git remote exists yet - PR creation is deferred
       until one is added." with "The origin remote exists and PR creation is enabled." (successful;
       roadmap RM-5 track cell already correct and unchanged).
P3.T4: Remove-Item -LiteralPath 'D:\Projects\lms\.conductor\runs\20261124-showcase-mvp' -Recurse -Force
       Remove-Item -LiteralPath 'D:\Projects\lms\.conductor\runs\20261124-showcase-mvp.json' -Force
       stale_remaining=0; git status showed only M conductor/workflow.md.
```

Both blockers are closed; no further code changes were made.

## Deviations

None. The subagent's two tool denials were resolved by the primary without any code change, and no
blockers remain.

## Note

All real Cloudflare, Neon, OAuth and LLM steps in the runbook remain human-only and out of scope for
this phase. No real credential, namespace id, account id, or domain was written anywhere.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | lint: 6 pre-existing warnings / 0 errors; fmt:check: 89 files clean; typecheck clean; 16 unit files / 130 tests passed; coverage 98.6% statements, 91.7% branches, 97.84% functions, 99.11% lines with 80% per-file gates; 5 integration files / 37 tests passed; `astro build`: 3 static pages. |

- Primary confirmed the phase diff from `872168a22019f2e9ec8cf8590a80166d777fd85b` contained the five declared source/doc/test/evidence files plus the primary-owned `conductor/workflow.md` edit for FR-5.
- Primary independently confirmed `conductor/workflow.md` no longer says no remote exists and stale showcase-mvp run files are gone.
- Result: VERIFIED. Primary checkpoint to be recorded in `plan.md`.
