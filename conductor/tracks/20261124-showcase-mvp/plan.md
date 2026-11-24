# Showcase MVP — Implementation Plan

> **Branch:** `feat/20261124-showcase-mvp`
> **Base:** `master` @ `79c054e8d6e5ca89d7cc389210b768b8484f9b17`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Foundation & Content Contracts

- **Goal:** Astro 7 builds a static catalog and lesson shell from a Zod-validated MDX collection, with tooling configured and zero JS on static pages.
- **Depends on:** none
- **Covers:** FR-1, FR-2, NFR-1, NFR-7, NFR-9, AC-1, AC-2, AC-16, AC-18, AC-22
- **Touches:** `package.json`, `pnpm-lock.yaml`, `astro.config.mjs`, `tsconfig.json`, oxlint/oxfmt configs, `src/content.config.ts`, `src/lib/scene-manifest.ts`, `src/content/lessons/heart.mdx`, `src/pages/index.astro`, `src/pages/lessons/[slug].astro`, `src/styles/**`, `tests/unit/*manifest*.test.ts`, `LICENSE`
- **Verification:** `pnpm verify`
- **Status:** verified

- [x] **P1.T1: Scaffold pnpm + Astro 7 + React island integration + TS 6.0.3** — covers: FR-1
- [x] **P1.T2: Configure oxlint/oxfmt/Vitest/coverage against the copied style guides** — covers: NFR-7
- [x] **P1.T3: Define lessons collection + generic Zod scene manifest** — covers: FR-2, NFR-9
  - [x] P1.T3.1: Manifest schema (model, camera, hotspots with IDs/positions)
  - [x] P1.T3.2: Build-time validation that every `data-hotspot` has a manifest ID
- [x] **P1.T4: Author heart lesson MDX with six hotspots and layered prose** — covers: FR-2
- [x] **P1.T5: Build static catalog + lesson page shell** — covers: FR-1, NFR-1
- [x] **P1.T6: Add contract tests, a second-topic simulation, and license file** — covers: AC-2, AC-16, AC-22

**Result:** verified
**Checkpoint:** ecff8e7
**Evidence:** conductor/tracks/20261124-showcase-mvp/verification/phase-1.md

## Phase 2: 3D Scene & Hotspot Binding

- **Goal:** The heart GLB renders as an R3F island with a graceful fallback chain and two-way hotspot↔prose binding.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-13, NFR-2, NFR-5, NFR-6, AC-3, AC-4, AC-5, AC-19
- **Touches:** `assets/heart/**`, `public/assets/heart/**`, `src/components/scene/**`, `src/lib/hotspot-store.ts`, `src/components/prose/**`, `tests/unit/hotspot-store.test.ts`, `tests/integration/glb-manifest.test.ts`, `tests/e2e/scene.spec.ts`
- **Verification:** `pnpm verify:full`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 9df6c5b
- **Evidence:** conductor/tracks/20261124-showcase-mvp/verification/phase-2.md

- [x] **P2.T1: Write ASSET_CONTRACT.md and author the Blender recipe (MCP-assisted) producing GLB + poster** — covers: FR-13
  - [x] P2.T1.1: Six named meshes matching hotspot IDs, Y-up glTF, semi-realistic low-poly, <1 MB
  - [x] P2.T1.2: Bake any interactive MCP edits back into the deterministic script
- [x] **P2.T2: Add GLB↔manifest integration check** — covers: AC-4
- [x] **P2.T3: Build R3F island with WebGPU→WebGL→poster fallback, heartbeat and flow particles** — covers: FR-3, NFR-2, NFR-6
- [x] **P2.T4: Wire shared hotspot store for two-way binding and camera tween** — covers: FR-4
- [x] **P2.T5: Implement reduced-motion, keyboard hotspots, and mobile prose behavior** — covers: NFR-5, AC-19
- [x] **P2.T6: Add scene E2E and smoke coverage** — covers: AC-3, AC-5

## Phase 3: API, Auth & Offline Progress

- **Goal:** Hono on Workers provides authenticated, session-scoped progress APIs backed by Neon, with offline queue sync.
- **Depends on:** Phase 1
- **Covers:** FR-6, FR-11, NFR-3, NFR-4, AC-7, AC-13, AC-21
- **Touches:** `api/**`, `drizzle.config.ts`, `migrations/**`, `wrangler.toml`, `src/lib/offline-queue.ts`, `src/lib/api-client.ts`, `tests/integration/progress.test.ts`, `tests/unit/api-client.test.ts`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** f43554b
- **Evidence:** conductor/tracks/20261124-showcase-mvp/verification/phase-3.md

- [x] **P3.T1: Scaffold Hono Worker with env bindings and health endpoint** — covers: NFR-4
- [x] **P3.T2: Drizzle schema + Neon pgvector migration + lesson seed** — covers: FR-6
- [x] **P3.T3: Better Auth with GitHub, Google, and email/password** — covers: FR-6
- [x] **P3.T4: Session-scoped progress endpoints + rate limiting** — covers: NFR-4
- [x] **P3.T5: IndexedDB append-only offline queue with auto-sync LWW** — covers: FR-11
- [x] **P3.T6: Integration tests and client secret audit** — covers: AC-7, AC-13, AC-21

## Phase 4: Grounded Tutor

- **Goal:** Anonymous and authenticated learners can ask course-grounded questions with validated citations under hard guardrails.
- **Depends on:** Phase 2, Phase 3
- **Covers:** FR-5, FR-7, FR-8, NFR-3, NFR-4, NFR-6, AC-6, AC-8, AC-9, AC-10, AC-17, AC-20, AC-21
- **Touches:** `api/src/routes/tutor.ts`, `api/src/lib/{retrieval,prompt,llm,quota,intent}.ts`, `scripts/embed-lessons.ts`, `src/components/tutor/**`, `src/lib/tutor-client.ts`, `tests/unit/{retrieval,prompt,quota,intent}.test.ts`, `tests/integration/tutor.test.ts`, `tests/e2e/tutor.spec.ts`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** b43a62a
- **Evidence:** conductor/tracks/20261124-showcase-mvp/verification/phase-4.md

- [x] **P4.T1: Chunk MDX, embed into pgvector, build hybrid BM25+vector retrieval** — covers: FR-7
- [x] **P4.T2: Layered prompt assembly, intent router, and cosine threshold** — covers: FR-8
- [x] **P4.T3: Env-configurable LLM adapter (Gemini/OpenAI) with streaming** — covers: FR-7, NFR-3
- [x] **P4.T4: KV anonymous 2-question quota, user/IP limits, kill switch, citation validation** — covers: FR-5, FR-8
- [x] **P4.T5: Right-dock tutor UI: chips + free text, active-hotspot context, clickable citations, disclosure** — covers: FR-7, FR-14
- [x] **P4.T6: Unit, integration, and E2E tests for grounded/quota/off-topic flows** — covers: AC-6, AC-8, AC-9, AC-10, AC-20

## Phase 5: Mastery, Quiz & Credentials

- **Goal:** Quiz, mastery model, and OB3 credential close the learning loop with a public verifier.
- **Depends on:** Phase 4
- **Covers:** FR-9, FR-10, FR-12, AC-11, AC-12, AC-14, AC-15
- **Touches:** `api/src/lib/mastery.ts`, `api/src/routes/{quiz,badge}.ts`, `api/src/lib/badge.ts`, `src/pages/verify.astro`, `src/components/mastery/**`, `src/components/quiz/**`, `tests/unit/{mastery,badge,quiz}.test.ts`, `tests/integration/badge.test.ts`, `tests/e2e/learning-loop.spec.ts`
- **Verification:** `pnpm verify:full`
- **Status:** verified

- [x] **P5.T1: BKT + FSRS mastery engine and heatmap state** — covers: FR-10
- [x] **P5.T2: Quiz generation + rubric grading + remediation links** — covers: FR-9
- [x] **P5.T3: Next-best-hotspot recommendation and FSRS due cards** — covers: FR-10
- [x] **P5.T4: OB3 issuance at mastery threshold + public verifier + tamper test** — covers: FR-12
- [x] **P5.T5: E2E full demo flow** — covers: AC-11, AC-12, AC-14, AC-15

**Result:** verified
**Checkpoint:** df16b86
**Evidence:** conductor/tracks/20261124-showcase-mvp/verification/phase-5.md

## Phase 6: Polish & Proof

- **Goal:** The showcase meets its performance, accessibility, licensing, and documentation bar with committed evidence.
- **Depends on:** Phase 5
- **Covers:** FR-1, FR-14, NFR-1, NFR-5, NFR-6, NFR-8, AC-1, AC-18, AC-19, AC-20, AC-22
- **Touches:** `README.md`, `src/styles/global.css`, `src/pages/index.astro`, `src/components/**`, `tests/e2e/**`, `lighthouse.config.*`, `docs/**`, `conductor/tracks/20261124-showcase-mvp/verification/**`
- **Verification:** `pnpm verify:full`
- **Status:** in_progress

- [ ] **P6.T1: Design tokens, responsive polish, light reading surface** — covers: FR-1
- [ ] **P6.T2: Accessibility audit, reduced-motion, keyboard pass** — covers: FR-14, NFR-5
- [ ] **P6.T3: Lighthouse ≥95 and bundle-budget assertions** — covers: NFR-1, AC-18
- [ ] **P6.T4: README: vision, demo script, architecture, setup, licenses, AI disclosure, WCAG statement** — covers: NFR-8, AC-20, AC-22
- [ ] **P6.T5: Integrated verification + committed evidence** — covers: NFR-6

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends:** Phase 6
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
