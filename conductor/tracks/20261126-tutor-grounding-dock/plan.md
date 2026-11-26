# Implement a sticky tutor dock with reliable hotspot-grounded answers — Implementation Plan

> **Branch:** `feat/20261126-tutor-grounding-dock`
> **Base:** `master` @ `31002092862d9477c5ed53393121fdf1ce3dc967`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Generic lesson chunk source

- **Goal:** every authored lesson yields retrieval chunks derived from its MDX, with no topic-specific constants in code.
- **Depends on:** none
- **Covers:** FR-7, NFR-6, AC-7
- **Touches:** `api/src/lib/retrieval.ts`, `api/src/data/`, `scripts/`, `tests/unit/retrieval.test.ts`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** a7ccbb5
- **Evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/phase-1.md

- [x] **P1.T1: Generate chunks from authored MDX** — covers: FR-7
  - [x] **P1.T1.1:** Add a build-time generator that reads the lesson content collection and emits a lesson→chunk manifest.
  - [x] **P1.T1.2:** Replace the heart-only mirror with a generic chunk loader keyed by `lessonId`.
  - [x] **P1.T1.3:** Preserve deterministic `lesson:hotspot:layer` chunk IDs and existing capping behaviour.
- [x] **P1.T2: Prove topic-agnostic chunks** — covers: AC-7
  - [x] **P1.T2.1:** Unit-test non-empty chunks for every authored lesson with IDs derived from content.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/phase-1.md
-->

## Phase 2: Hotspot-scoped retrieval and citation gate

- **Goal:** answers are built only from the focused hotspot's chunks, with explicit fallbacks and no cross-hotspot citations.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-8, NFR-4, AC-1, AC-2, AC-3, AC-8
- **Touches:** `api/src/routes/tutor.ts`, `api/src/lib/retrieval.ts`, `api/src/lib/prompt.ts`, `tests/unit/retrieval.test.ts`, `tests/unit/prompt.test.ts`, `tests/integration/tutor.test.ts`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** afae0c2
- **Evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/phase-2.md

- [x] **P2.T1: Scope retrieval to the active hotspot** — covers: FR-1, FR-2
  - [x] **P2.T1.1:** Filter by `hotspotId` before ranking when the request has a valid hotspot.
  - [x] **P2.T1.2:** Return `no_context` plus static excerpt when the focused hotspot has no chunks; use lesson-wide retrieval when no focus is selected.
- [x] **P2.T2: Align prompt and citation validation** — covers: FR-3
  - [x] **P2.T2.1:** Build "Allowed chunk IDs" and the validation set from the same scoped result.
  - [x] **P2.T2.2:** Reject cross-hotspot citations before any answer delta streams.
- [x] **P2.T3: Preserve failure paths** — covers: FR-8
  - [x] **P2.T3.1:** Keep quota, off-topic, unavailable and invalid-citation responses on the existing error + static-excerpt path.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/phase-2.md
-->

## Phase 3: Sticky dock and mobile bottom sheet

- **Goal:** the question box, focus label and answer stay reachable at all desktop widths, with a collapsible sheet on narrow screens.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, FR-6, FR-9, NFR-2, NFR-3, NFR-5, AC-4, AC-5, AC-6
- **Touches:** `src/components/tutor/TutorDock.tsx`, `src/components/tutor/tutor.css`, `src/lib/hotspot-store.ts`, `tests/e2e/tutor.spec.ts`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e`
- **Status:** verified

- [x] **P3.T1: Sticky desktop dock** — covers: FR-4
  - [x] **P3.T1.1:** Make the dock persist through lesson scroll from 1024px up without covering prose or hotspots.
- [x] **P3.T2: Collapsible mobile bottom sheet** — covers: FR-5
  - [x] **P3.T2.1:** Add collapsed Ask control, sheet expansion, Escape-to-close and focus management below 1024px.
- [x] **P3.T3: Focus binding and chip scoping** — covers: FR-6, FR-9
  - [x] **P3.T3.1:** Update the context label from the hotspot store and scope each new question to the current focus while keeping history.
  - [x] **P3.T3.2:** Ensure chip questions carry their explicit hotspot and citations refocus that hotspot.
- [x] **P3.T4: Viewport E2E coverage** — covers: AC-4, AC-5, AC-6
  - [x] **P3.T4.1:** Add Playwright checks at 1280×800, 1024×768 and 390×844 for dock visibility and sheet behaviour.

**Primary browser pass:** required for this UI-bearing phase and mandatory at review and after every fix round, per workflow. Evidence: `conductor/tracks/20261126-tutor-grounding-dock/verification/browser.md`.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/phase-3.md
-->

**Result:** verified
**Checkpoint:** d60fb4d
**Evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/phase-3.md
**Browser evidence:** conductor/tracks/20261126-tutor-grounding-dock/verification/browser.md
