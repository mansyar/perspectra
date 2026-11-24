# Release readiness — Implementation Plan

> **Branch:** `chore/20261124-release-readiness`
> **Base:** `master` @ `496f53c5805d42f983f6aba0104249d7ebfd8b28`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: PR Verification Workflow

- **Goal:** every pull request runs static/unit/integration/build plus smoke/E2E/Lighthouse checks with no secrets required.
- **Depends on:** none
- **Covers:** FR-1, FR-8, AC-1, AC-2, NFR-2, NFR-3
- **Touches:** `.github/workflows/**`, `scripts/check-ci.mjs`, `package.json`, `conductor/tracks/20261124-release-readiness/verification/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P1.T1: Add pull-request CI workflow** — covers: FR-1, AC-2
  - [ ] **P1.T1.1: Install pnpm/Node and cache the pnpm store**
  - [ ] **P1.T1.2: Install Playwright Chromium in the e2e job**
  - [ ] **P1.T1.3: Allow one retry for known oxfmt/Lighthouse flakes**
- [ ] **P1.T2: Add a local CI contract checker** — covers: AC-1
  - [ ] **P1.T2.1: Assert `pull_request` trigger and both job names**
  - [ ] **P1.T2.2: Wire `pnpm check:ci` in package.json**
- [ ] **P1.T3: Add CI contract tests** — covers: AC-1, AC-2
- [ ] **P1.T4: Record phase 1 evidence** — covers: FR-8

## Phase 2: Real Database Scripts

- **Goal:** `db:push` and `db:seed` are executable, honest commands backed by Drizzle Kit and an idempotent `tsx` CLI.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-8, AC-3, NFR-4
- **Touches:** `package.json`, `pnpm-lock.yaml`, `api/src/db/seed.ts`, `tests/unit/db-scripts.test.ts`, `conductor/tracks/20261124-release-readiness/verification/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P2.T1: Add tsx and replace placeholder scripts** — covers: FR-2, NFR-4
- [ ] **P2.T2: Add a CLI entry to the seed module** — covers: FR-2, AC-3
  - [ ] **P2.T2.1: Keep `seedHeart` idempotent via upsert**
  - [ ] **P2.T2.2: Read `DATABASE_URL` only at CLI runtime**
- [ ] **P2.T3: Add script-contract and seed-idempotence tests** — covers: AC-3
- [ ] **P2.T4: Record phase 2 evidence** — covers: FR-8

## Phase 3: Deploy Configuration, Docs and Workspace Cleanup

- **Goal:** the repo is deployable-by-runbook, rejects placeholder KV ids, has accurate Conductor docs, and has no stale runtime runs.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-4, FR-5, FR-6, FR-8, AC-4, AC-5, AC-6, AC-7, NFR-1, NFR-5, NFR-8
- **Touches:** `wrangler.toml`, `scripts/check-config.mjs`, `package.json`, `docs/DEPLOYMENT.md`, `conductor/workflow.md`, `conductor/roadmap.md`, `tests/unit/config-check.test.ts`, `.conductor/runs/**`, `conductor/tracks/20261124-release-readiness/verification/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P3.T1: Add KV placeholder validation** — covers: FR-3, AC-4
  - [ ] **P3.T1.1: Keep `wrangler.toml` id unmistakably fake**
  - [ ] **P3.T1.2: Wire `pnpm check:config` and test pass/fail paths**
- [ ] **P3.T2: Write `docs/DEPLOYMENT.md`** — covers: FR-4, AC-5, NFR-1
  - [ ] **P3.T2.1: Document env vars, KV, migration, seed and embedding ingest**
  - [ ] **P3.T2.2: Document Worker deploy, smoke and rollback**
- [ ] **P3.T3: Correct Workflow Config and link RM-5** — covers: FR-5, AC-6, NFR-5
- [ ] **P3.T4: Delete stale `.conductor/runs/20261124-showcase-mvp*` files** — covers: FR-6, AC-7, NFR-8
- [ ] **P3.T5: Add config tests and record phase 3 evidence** — covers: FR-8, AC-4, AC-5

## Phase 4: Generic Badge Narrative

- **Goal:** credentials for non-heart lessons display lesson-correct prose without changing verification semantics.
- **Depends on:** Phase 3
- **Covers:** FR-7, FR-8, AC-8, AC-9, NFR-6
- **Touches:** `api/src/lib/badge.ts`, `api/src/routes/badge.ts`, `tests/unit/badge.test.ts`, `tests/integration/badge.test.ts`, `conductor/tracks/20261124-release-readiness/verification/browser.md`, `conductor/tracks/20261124-release-readiness/verification/**`
- **Verification:** `pnpm verify:full`
- **Status:** pending

- [ ] **P4.T1: Derive badge narrative from lesson vocabulary and hotspot count** — covers: FR-7, NFR-6
- [ ] **P4.T2: Add non-heart narrative tests** — covers: AC-8
- [ ] **P4.T3: Run browser verification on the verifier page** — covers: FR-8, AC-9
- [ ] **P4.T4: Record phase 4 evidence** — covers: FR-8

## Phase 5: Integrated Verification and Proof

- **Goal:** the complete track passes the configured verification chain and has honest committed evidence with no placeholders or secrets left behind.
- **Depends on:** Phase 4
- **Covers:** FR-8, AC-10, NFR-1, NFR-7
- **Touches:** `conductor/tracks/20261124-release-readiness/verification/integrated.md`, `conductor/tracks/20261124-release-readiness/verification/**`
- **Verification:** `pnpm verify:full`
- **Status:** pending

- [ ] **P5.T1: Run the full verification chain and Lighthouse budgets** — covers: AC-10, NFR-7
- [ ] **P5.T2: Audit for committed secrets and placeholder values** — covers: NFR-1, AC-5
- [ ] **P5.T3: Write integrated verification evidence** — covers: FR-8, AC-10

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-release-readiness/verification/phase-<n>.md
-->
