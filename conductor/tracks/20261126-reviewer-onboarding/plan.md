# Reviewer Onboarding & Trust — Implementation Plan

> **Branch:** `feat/20261126-reviewer-onboarding`
> **Base:** `master` @ `96920affde115b46a40d4f2398a3079dfea89eea`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Global Header & Sign-in Page

- **Goal:** Public pages expose consistent navigation and a working dedicated
  sign-in entry point with a validated return URL.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, AC-1, AC-2, AC-3, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5
- **Touches:** `src/components/layout/**`, `src/lib/auth-navigation.ts`, `src/pages/sign-in.astro`, `src/pages/index.astro`, `src/pages/lessons/[slug].astro`, `src/pages/verify.astro`, `src/styles/global.css`, `tests/unit/**`, `tests/e2e/**`, `conductor/tracks/20261126-reviewer-onboarding/verification/**`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified — `pnpm verify` exited 0; shared header, sign-in page, return-URL helper and onboarding tests are in place.
- **Checkpoint:** `f2442bb9a7edb447ef7ea7e4e92ee7c2e0307a6c`
- **Evidence:** `conductor/tracks/20261126-reviewer-onboarding/verification/phase-1.md`

- [x] **P1.T1: Build shared header component** — covers: FR-1, AC-1, NFR-1, NFR-2, NFR-5
- [x] **P1.T2: Add `/sign-in` page with email/password and Google buttons** — covers: FR-2, AC-2, NFR-3
- [x] **P1.T3: Validate `next` and implement account/sign-out state** — covers: FR-3, AC-3, NFR-3
- [x] **P1.T4: Add header and sign-in unit/E2E tests** — covers: FR-1, FR-2, FR-3, AC-1, AC-2, AC-3

## Phase 2: Inline CTAs & Trust Copy

- **Goal:** Anonymous learners can enter sign-in from mastery/quiz, and the
  verifier and catalog present truthful, polished copy.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, AC-4, AC-5, AC-6, NFR-2, NFR-5
- **Touches:** `src/components/mastery/**`, `src/components/quiz/**`, `src/lib/auth-navigation.ts`, `src/pages/verify.astro`, `src/pages/index.astro`, `src/styles/**`, `tests/unit/**`, `tests/e2e/**`, `conductor/tracks/20261126-reviewer-onboarding/verification/**`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified — `pnpm verify` exited 0; inline sign-in CTAs, truthful verifier copy, and coming-soon spacing are covered by unit and E2E specs.
- **Checkpoint:** `1a2cea9c30493ea42a4302f6f5f27658b638754c`
- **Evidence:** `conductor/tracks/20261126-reviewer-onboarding/verification/phase-2.md`

- [x] **P2.T1: Add mastery auth CTA with lesson return URL** — covers: FR-4, AC-4
- [x] **P2.T2: Add quiz auth CTA with lesson return URL** — covers: FR-4, AC-4
- [x] **P2.T3: Correct verifier copy and sample-button styling** — covers: FR-5, AC-5, NFR-2
- [x] **P2.T4: Fix catalog coming-soon label spacing** — covers: FR-6, AC-6, NFR-5
- [x] **P2.T5: Add CTA, verifier, and catalog regression tests** — covers: FR-4, FR-5, FR-6, AC-4, AC-5, AC-6

## Phase 3: Browser Proof & Final Gates

- **Goal:** The track closes with complete local/browser evidence, unchanged
  performance budgets, and no secrets or topic-specific logic introduced.
- **Depends on:** Phase 2
- **Covers:** FR-7, AC-7, AC-8, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6
- **Touches:** `tests/e2e/**`, `README.md`, `docs/**`, `conductor/tracks/20261126-reviewer-onboarding/verification/**`
- **Verification:** `pnpm verify:full`
- **Status:** in_progress

- [ ] **P3.T1: Run full local verification and Lighthouse budgets** — covers: AC-7, NFR-1, NFR-6
- [ ] **P3.T2: Complete primary browser pass on catalog, lesson, `/sign-in`, and `/verify`** — covers: FR-7, AC-7, NFR-2, NFR-5
- [ ] **P3.T3: Audit for secrets, dependencies, and topic-specific logic** — covers: AC-8, NFR-3, NFR-4, NFR-6
- [ ] **P3.T4: Write integrated verification evidence** — covers: FR-7, AC-7, AC-8

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
