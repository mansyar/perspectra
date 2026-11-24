# Release readiness — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it.

## Overview

This chore makes the completed Showcase MVP trustworthy as a portfolio artifact: PRs get automated verification, database scripts stop being placeholders, deployment becomes documented and checkable, stale runtime state is cleared, and the only accepted review residual is closed.

## Problem / Motivation

PR #1 merged with no CI checks; `db:push`/`db:seed` are placeholder echoes; `wrangler.toml` contains a dummy KV id; no deployment runbook exists; stale `.conductor/runs` files remain; and badge prose is still heart-specific for non-heart lessons. A reviewer cannot confidently verify or deploy the project from the repo alone.

## Goals & Success Metrics

- **Goal:** every future PR runs the project’s verification standard, and the repo is deployable-by-runbook without secrets or real ids committed.
- **Metrics:** two required PR checks; real DB scripts; config check rejects placeholder KV; complete runbook; zero stale runtime runs; non-heart badge narrative test; all existing checks still pass.

## Scope

### In Scope

- GitHub Actions on pull requests only: job 1 `pnpm verify`; job 2 `pnpm smoke && pnpm test:e2e` including Lighthouse, with one retry for known flakes.
- Real `db:push` (`drizzle-kit`) and `db:seed` (`tsx` CLI) scripts; add `tsx` dev dependency.
- Obvious KV placeholder plus a config check that fails on it; deployment runbook.
- Correct the stale “No git remote exists yet” Workflow Config note.
- Link roadmap RM-5 to the resulting track.
- Delete stale `.conductor/runs/20261124-showcase-mvp*`.
- Generalize badge narrative so non-heart lessons do not say “heart landmark”.
- Record browser evidence for the badge verifier text.

### Out of Scope

- Live deployment, real credentials, domain purchase, secrets in the repo.
- Product features beyond the badge narrative wording fix.
- Changes to tutoring, mastery logic, renderer, or content model.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add GitHub Actions triggered on `pull_request` with two required jobs: `verify` (`pnpm verify`) and `e2e` (`pnpm smoke && pnpm test:e2e`), installing pnpm/Node/Playwright Chromium and allowing one retry for known oxfmt/Lighthouse flakes. | must |
| FR-2 | Replace placeholder `db:push` with `drizzle-kit push` using `drizzle.config.ts`; replace `db:seed` with a `tsx` CLI entry in `api/src/db/seed.ts` that remains idempotent; add `tsx` as a dev dependency. | must |
| FR-3 | Keep an unmistakably fake `RATE_LIMIT_KV` id in `wrangler.toml` and add a config check script that fails while the placeholder remains and passes when a real namespace id or approved override is supplied. | must |
| FR-4 | Add `docs/DEPLOYMENT.md` covering prerequisites, env vars, KV namespace creation, migrations, seeding, embedding ingest, Worker deploy, smoke test, and rollback; include no secret values. | must |
| FR-5 | Correct the Workflow Config note about the git remote and link roadmap RM-5’s `track` column to this track id. | must |
| FR-6 | Delete stale `.conductor/runs/20261124-showcase-mvp*` runtime files without touching committed Conductor state. | must |
| FR-7 | Derive badge achievement narrative from lesson vocabulary/count so a non-heart lesson does not display “heart landmark” or a fixed “six landmarks” claim. | must |
| FR-8 | Record phase evidence, integrated verification and a browser pass for the badge verifier text at review. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No real secrets, OAuth keys, LLM keys, database URLs or Cloudflare account ids are committed. |
| NFR-2 | CI requires no external services or credentials; all tests continue to use injected fakes. |
| NFR-3 | Retry logic is limited to the two known flakes and never hides a real failure. |
| NFR-4 | Only one new dev dependency (`tsx`) is introduced. |
| NFR-5 | Docs and workflow config match reality; no stale “no remote” wording remains. |
| NFR-6 | FR-7 changes presentation only; credential verification semantics and HMAC proof remain unchanged. |
| NFR-7 | All configured verification commands pass, with the existing per-file 80% coverage gate unchanged. |
| NFR-8 | Runtime cleanup affects only gitignored `.conductor/` files. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `.github/workflows/*.yml` exists, triggers on `pull_request`, and defines `verify` and `e2e` jobs. | FR-1 |
| AC-2 | A CI dry run with no secrets installs dependencies and Playwright Chromium and executes both jobs successfully, allowing one documented retry. | FR-1, NFR-2, NFR-3 |
| AC-3 | `pnpm db:push` invokes Drizzle Kit with `drizzle.config.ts`; `pnpm db:seed` invokes the `tsx` CLI; the seed remains idempotent. | FR-2 |
| AC-4 | The config check fails on the dummy KV id and passes with a supplied non-placeholder value. | FR-3 |
| AC-5 | `docs/DEPLOYMENT.md` contains every env var and ordered steps for KV, migration, seed, embedding ingest, Worker deploy, smoke and rollback, with no secret values. | FR-4, NFR-1 |
| AC-6 | Workflow Config no longer says there is no remote; roadmap RM-5 points to this track id. | FR-5 |
| AC-7 | No `.conductor/runs/20261124-showcase-mvp*` files remain. | FR-6 |
| AC-8 | A non-heart badge test asserts the narrative uses that lesson’s vocabulary/count and contains no heart wording. | FR-7, NFR-6 |
| AC-9 | Browser evidence shows the verifier page rendering the generalized narrative with no unexpected console errors. | FR-8 |
| AC-10 | `pnpm verify:full` exits 0 and no new Critical/High review findings remain. | FR-8, NFR-7 |

## Edge Cases

- `pnpm fmt:check` intermittently exits 5 while printing that all files are correct; retry once, never reformat blindly.
- Lighthouse can fail transiently on Chromium cleanup; retry once.
- CI has no `DATABASE_URL`, OAuth keys or LLM keys; tests must remain fake-driven.
- A real KV id may be absent locally; the check must distinguish placeholder from operator-supplied values.
- The badge narrative must not rely on the heart’s six-hotspot vocabulary.
- Stale run files are gitignored, so cleanup must not create a tracked diff.

## Dependencies

- **Tracks:** none. `20261124-showcase-mvp` is complete and merged.
- **External:** GitHub Actions, npm registry for `tsx`, GitHub CLI/Wrangler docs for runbook accuracy. No credentials required.

## Open Questions & Assumptions

- **Assumption:** CI runs on pull requests only, as selected.
- **Assumption:** one retry is enough for known oxfmt/Lighthouse flakes.
- **Assumption:** deployment remains a separate human-gated track once credentials exist.
- **Question:** actual domain, Cloudflare account and Neon branch are deferred.

## References

- `conductor/workflow.md` — Workflow Config and Verification Strategy.
- `conductor/roadmap.md` — RM-5.
- `conductor/archive/20261124-showcase-mvp/review.md` — R2-L1 residual.
- `drizzle.config.ts`, `api/src/db/seed.ts`, `wrangler.toml`, `package.json`, `README.md`.
- Diagnostics from `conductor-status` showing missing CI, placeholder scripts, dummy KV id and stale runs.
