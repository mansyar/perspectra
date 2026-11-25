# Earth Interior Topic Proof — Implementation Plan

> **Branch:** `feat/20261125-earth-interior-proof`
> **Base:** `master` @ `4b2067b0a4ae657e6339296cbbcaca6bbfb6d322`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Earth Content & Catalog Contract

- **Goal:** The Earth lesson is complete, scientifically grounded, build-validated, and visible in a topic-neutral catalog.
- **Depends on:** Public deployment track
- **Covers:** FR-1, FR-4, AC-1, AC-3, NFR-4
- **Touches:** `src/content/lessons/earth-interior.mdx`, `src/pages/index.astro`, `tests/integration/content-contract.test.ts`, `tests/e2e/catalog.spec.ts`, `README.md`, `conductor/tracks/20261125-earth-interior-proof/verification/**`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm test && pnpm coverage && pnpm test:integration tests/integration/content-contract.test.ts && pnpm build && pnpm exec playwright test --grep '@catalog'` (asset readiness is verified by the full chain in Phase 2)
- **Status:** verified
- **Result:** verified; content/catalog checks pass, asset-readiness checks intentionally run in Phase 2
- **Checkpoint:** `f6524e5`
- **Evidence:** `conductor/tracks/20261125-earth-interior-proof/verification/phase-1.md`

- [x] **P1.T1: Author the layered Earth lesson and source references** — covers: FR-1, NFR-4
- [x] **P1.T2: Add Earth scene and hotspot contract validation** — covers: FR-1, AC-1
- [x] **P1.T3: Generalize catalog copy and category presentation** — covers: FR-4, AC-3
- [x] **P1.T4: Record phase evidence** — covers: FR-8

## Phase 2: Detailed 3D Cutaway & Scene Integration

- **Goal:** A detailed semi-realistic Earth cutaway renders through the existing generic scene pipeline with all fallbacks.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, AC-1, AC-2, NFR-3, NFR-4
- **Touches:** `assets/earth-interior/**`, `public/assets/earth-interior/**`, `src/content/lessons/earth-interior.mdx`, `src/components/scene/**`, `tests/integration/glb-manifest.test.ts`, `tests/e2e/scene.spec.ts`, `tests/e2e/earth-scene.spec.ts`, `tests/e2e/performance.spec.ts`, `playwright.config.ts`, `README.md`, `conductor/tracks/20261125-earth-interior-proof/verification/**`
- **Verification:** `pnpm verify:full`
- **Status:** verified
- **Result:** verified — detailed Earth cutaway, generic scene integration, desktop/mobile browser pass, and per-lesson Lighthouse budgets.
- **Checkpoint:** `77ad9a4`
- **Evidence:** `conductor/tracks/20261125-earth-interior-proof/verification/phase-2.md`

- [x] **P2.T1: Author the deterministic detailed Blender recipe** — covers: FR-2, NFR-4
- [x] **P2.T2: Export and validate the GLB, WebP poster, and asset contract** — covers: FR-2, AC-2
- [x] **P2.T3: Connect the Earth manifest through generic scene code** — covers: FR-3, FR-7, AC-1
- [x] **P2.T4: Add hotspot, keyboard, reduced-motion, fallback, and per-lesson performance regression tests** — covers: FR-3, AC-1, AC-2, NFR-3
- [x] **P2.T5: Record visual-quality and phase evidence** — covers: FR-8, NFR-4

## Phase 3: Generic Learning Loop & Additive Ingestion

- **Goal:** Earth works through retrieval, tutor, quiz, mastery, FSRS, and badges without heart-specific behavior.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, FR-7, AC-5, AC-6, AC-7, NFR-1, NFR-5
- **Touches:** `api/src/db/seed.ts`, `scripts/embed-lessons.ts`, `api/src/lib/**`, `api/src/routes/**`, `src/components/tutor/**`, `src/components/quiz/**`, `src/components/mastery/**`, `tests/**`, `README.md`, `conductor/tracks/20261125-earth-interior-proof/verification/**`
- **Verification:** `pnpm verify:full`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `634648e`
- **Evidence:** `conductor/tracks/20261125-earth-interior-proof/verification/phase-3.md`

- [x] **P3.T1: Add idempotent Earth lesson and hotspot seeding** — covers: FR-5, NFR-5
- [x] **P3.T2: Ingest Earth chunks with Gemini and prove repeatability** — covers: FR-5, NFR-5
- [x] **P3.T3: Cover the second-topic tutor, quiz, mastery, FSRS, and badge loop** — covers: FR-6, AC-5, AC-6
- [x] **P3.T4: Audit and fix residual topic-specific application logic** — covers: FR-7, AC-7, NFR-1
- [x] **P3.T5: Record phase evidence** — covers: FR-8

## Phase 4: Production Rollout & Real-Service Proof

- **Goal:** Both lessons are live and verified on the public workers.dev origin without resetting existing data.
- **Depends on:** Phase 3
- **Covers:** FR-8, AC-4, AC-5, AC-6, AC-8, NFR-2, NFR-3, NFR-5, NFR-6, NFR-7
- **Touches:** `scripts/production-smoke.mjs`, `tests/e2e/earth-loop.spec.ts`, `docs/DEPLOYMENT.md`, `README.md`, `conductor/tracks/20261125-earth-interior-proof/verification/**`
- **Verification:** `pnpm verify:full && pnpm test:production`
- **Status:** pending

- [ ] **P4.T1: Generalize the tracked production smoke runner by lesson ID** — covers: FR-8, NFR-5
- [ ] **P4.T2: Additively seed and embed Earth in production** — covers: AC-4, NFR-5, NFR-6
- [ ] **P4.T3: Manually deploy and run production E2E and real-service smoke** — covers: AC-4, AC-5, AC-6, AC-8, NFR-7
- [ ] **P4.T4: Record production browser, console, fallback, and Lighthouse evidence** — covers: FR-8, AC-8, NFR-2, NFR-3

## Phase 5: Integrated Proof & Documentation

- **Goal:** The track closes with complete local/production evidence, clean audits, and reviewer-ready documentation.
- **Depends on:** Phase 4
- **Covers:** FR-8, AC-8, AC-9, AC-10, NFR-2, NFR-6, NFR-7
- **Touches:** `README.md`, `docs/**`, `assets/earth-interior/ASSET_CONTRACT.md`, `conductor/tracks/20261125-earth-interior-proof/verification/**`
- **Verification:** `pnpm verify:full && pnpm test:production`
- **Status:** pending

- [ ] **P5.T1: Run final local and production regression checks** — covers: AC-8, AC-10, NFR-2, NFR-7
- [ ] **P5.T2: Audit secrets, asset provenance, and topic independence** — covers: AC-7, AC-9, NFR-1, NFR-4, NFR-6
- [ ] **P5.T3: Consolidate integrated evidence, docs, and demo proof** — covers: FR-8, AC-10
