# Public deployment — Implementation Plan

> **Branch:** `chore/20261124-public-deployment`
> **Base:** `master` @ `02ae838f92fbdb0bd11df2dcea84a3cb5ff29bdd`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the primary records them.

## Phase 1: Documentation & State Hygiene

- **Goal:** Roadmap, README, and runtime state accurately reflect completed release-readiness work and the new deployment milestone.
- **Depends on:** none
- **Covers:** FR-10, AC-11
- **Touches:** `conductor/roadmap.md`, `README.md`, `.conductor/runs/20261124-release-readiness*`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P1.T1: Retire RM-5 and add RM-6 Public deployment** — covers: FR-10, AC-11
- [ ] **P1.T2: Remove stale release-readiness run artifacts** — covers: FR-10, AC-11
- [ ] **P1.T3: Correct README topic-onboarding and archived evidence links** — covers: FR-10, AC-11
- [ ] **P1.T4: Record phase 1 evidence** — covers: FR-10, AC-11

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-public-deployment/verification/phase-1.md
-->

## Phase 2: Gemini-Native Embeddings

- **Goal:** Chat and embeddings both use Gemini, with deterministic 1536-dimensional vectors compatible with the existing schema.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, NFR-4, AC-3, AC-4
- **Touches:** `api/src/env.ts`, `api/src/lib/llm.ts`, `scripts/embed-lessons.ts`, relevant unit/integration tests
- **Verification:** `pnpm verify:full`
- **Status:** pending

- [ ] **P2.T1: Extend environment and LLM adapter contracts for Gemini embeddings** — covers: FR-3
- [ ] **P2.T2: Implement gemini-embedding-2 batch requests, dimension validation, and normalization** — covers: FR-4, NFR-4
- [ ] **P2.T3: Update lesson ingestion to use the shared adapter and reject mixed embedding spaces** — covers: FR-5
- [ ] **P2.T4: Add Gemini request, response, ordering, dimension, and failure tests** — covers: FR-3, FR-4, AC-3
- [ ] **P2.T5: Record phase 2 evidence** — covers: FR-5, AC-4

<!--
Review fixes are appended by `conductor-review` as needed.
-->

## Phase 3: Same-Origin Worker & Production E2E Mode

- **Goal:** One Worker serves the static site and API, and the test harness can target an external URL.
- **Depends on:** Phase 2
- **Covers:** FR-1, FR-2, FR-6, AC-1, AC-2, AC-9, NFR-1, NFR-3, NFR-5
- **Touches:** `wrangler.toml`, `api/src/index.ts` or a Worker entry file, `scripts/check-config.mjs`, deployment scripts, `playwright.config.ts`, `package.json`, deployment docs, tests
- **Verification:** `pnpm verify:full`
- **Status:** pending

- [ ] **P3.T1: Configure Workers Static Assets and the ASSETS binding** — covers: FR-1
- [ ] **P3.T2: Route API and health requests to Hono with static fallback and real 404s** — covers: FR-2, AC-1, AC-2
- [ ] **P3.T3: Add E2E_BASE_URL mode and test:production** — covers: FR-6, AC-9
- [ ] **P3.T4: Add no-secret deployment configuration that injects the private KV namespace id** — covers: NFR-1, NFR-5
- [ ] **P3.T5: Replace the split-origin deployment runbook** — covers: FR-8, NFR-1, NFR-5
- [ ] **P3.T6: Add routing and production-mode tests and record evidence** — covers: FR-1, FR-2, FR-6, AC-1, AC-2, AC-9

## Phase 4: Human-Assisted Production Deployment

- **Goal:** The public workers.dev URL runs the full vertical slice against real Cloudflare, Neon, OAuth, and Gemini services.
- **Depends on:** Phase 3
- **Covers:** FR-7, FR-8, FR-9, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10, NFR-2, NFR-4, NFR-6, NFR-8
- **Touches:** ignored local environment files, `docs/DEPLOYMENT.md`, production and browser evidence
- **Verification:** `pnpm verify:full`, `pnpm test:production`, and primary browser verification
- **Status:** pending

- [ ] **P4.T1: Guide credential setup and validate production configuration** — covers: FR-8, AC-10, NFR-8
- [ ] **P4.T2: Deploy the Worker and initialize the fresh Neon branch, seed, and Gemini embeddings** — covers: FR-7, AC-4
- [ ] **P4.T3: Verify GitHub, Google, and email/password auth on the public origin** — covers: AC-5
- [ ] **P4.T4: Verify anonymous and authenticated tutor, quiz, mastery, and badge flows** — covers: FR-9, AC-6, AC-7, AC-8
- [ ] **P4.T5: Run production E2E, browser, console, and Lighthouse checks and record evidence** — covers: AC-9, AC-10, NFR-2, NFR-8

## Phase 5: Integrated Verification & Proof

- **Goal:** All local and production evidence is consolidated and the track is ready for review.
- **Depends on:** Phase 4
- **Covers:** FR-9, FR-10, AC-9, AC-10, AC-12, NFR-1, NFR-2, NFR-7, NFR-8
- **Touches:** `verification/integrated.md` and related evidence
- **Verification:** `pnpm verify:full` and `pnpm test:production`
- **Status:** pending

- [ ] **P5.T1: Run final local and production verification** — covers: AC-9, AC-12, NFR-2, NFR-7
- [ ] **P5.T2: Audit repository and configuration for secrets and placeholder regressions** — covers: AC-10, NFR-1
- [ ] **P5.T3: Write integrated evidence with live URL, phase roll-up, and known exceptions** — covers: FR-9, FR-10, NFR-8
