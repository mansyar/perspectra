# Reframe the 3D stage with a larger model, interaction hints and calmer motion — Implementation Plan

> **Branch:** `feat/20261127-scene-stage-reframing`
> **Base:** `master` @ `b336abd1e5873de5153e76c800c922d37c7414e7`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Scene contract and framing baseline

- **Goal:** Establish a backward-compatible animation manifest and aspect-aware framing utilities, then record the current visual baseline.
- **Depends on:** none
- **Covers:** FR-4, FR-8, NFR-1, NFR-5, AC-5
- **Touches:** `src/lib/scene-manifest.ts`, `src/components/scene/framing.ts`, `tests/unit/manifest-schema.test.ts`, `tests/unit/framing.test.ts`, `tests/integration/content-contract.test.ts`, `tests/integration/glb-manifest.test.ts`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration`
- **Status:** verified

- [x] **P1.T1: Define the hotspot-animation manifest contract** — covers: FR-4, NFR-1, AC-5
  - [x] Add optional hotspot-to-clip declarations with stable IDs and positive optional durations.
  - [x] Reject unknown hotspot IDs, duplicate clips/triggers, and malformed declarations while keeping animation-less lessons valid.
  - [x] Add unit and content-contract tests for valid, invalid, and absent animation metadata.
- [x] **P1.T2: Add aspect-aware framing utilities** — covers: FR-8, AC-1, AC-2
  - [x] Extend shared framing math to evaluate horizontal and vertical bounds at 4:3, 1:1, and desktop aspect ratios.
  - [x] Preserve existing `focusPose` behavior and whole-model margin guarantees.
  - [x] Add deterministic unit tests using synthetic model bounds and target viewport ratios.
- [x] **P1.T3: Record the current framing baseline** — covers: AC-1
  - [x] Measure both shipped GLBs at rest and across every hotspot.
  - [x] Record camera distance, view/model ratios, projected bounds, and poster observations in `verification/phase-1.md`.

**Result:** verified
**Checkpoint:** 1888bc5
**Evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/phase-1.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/phase-1.md
-->

## Phase 2: Refine and regenerate lesson assets

- **Goal:** Refine the existing Heart and Earth assets, author useful hotspot clips, and regenerate contract-clean GLB/poster outputs with closer camera-first framing.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-6, FR-9, NFR-5, AC-1, AC-7
- **Touches:** `assets/heart/**`, `assets/earth-interior/**`, `public/assets/heart/**`, `public/assets/earth-interior/**`, `src/content/lessons/heart.mdx`, `src/content/lessons/earth-interior.mdx`, `tests/integration/glb-manifest.test.ts`, `tests/integration/content-contract.test.ts`
- **Verification:** `blender --background --python assets/heart/build_heart.py && blender --background --python assets/earth-interior/build_earth.py && pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e`
- **Status:** verified

- [x] **P2.T1: Tune camera-first framing per lesson** - covers: FR-1, FR-8, FR-9, AC-1
  - [x] Use measured GLB bounds to choose closer camera/target/FOV values for both lessons.
  - [x] Keep the whole intended model visible at rest and for every hotspot, including mobile-safe ratios.
  - [x] Align Blender poster cameras with the final MDX cameras and update both asset contracts.
- [x] **P2.T2: Refine materials, lighting, and hotspot clips** - covers: FR-3, FR-4, FR-6, AC-4
  - [x] Improve existing geometry/materials/lighting without replacing model sources or adding topics.
  - [x] Author brief, purposeful hotspot-triggered clips only where they clarify the focused structure.
  - [x] Export named clips that match manifest declarations; prohibit ambient looping clips.
- [x] **P2.T3: Regenerate and gate all shipped outputs** - covers: FR-6, FR-9, NFR-5, AC-7
  - [x] Regenerate both GLBs plus PNG/WebP posters from the updated recipes.
  - [x] Inspect real poster renders for framing, clipping, lighting consistency, and visual improvement.
  - [x] Extend integration tests for GLB size, six named hotspot meshes, animation references, poster size/type, and safe framing.

**Result:** verified
**Checkpoint:** e15e1be
**Evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/phase-2.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/phase-2.md
-->

## Phase 3: Guided stage and calm runtime

- **Goal:** Make the stage visually larger, accurately guided, responsive, and calm while playing only manifest-declared hotspot animations.
- **Depends on:** Phase 2
- **Covers:** FR-2, FR-3, FR-4, FR-5, FR-7, FR-8, FR-9, NFR-1, NFR-2, NFR-3, NFR-4, NFR-7, AC-2, AC-3, AC-4, AC-5, AC-6
- **Touches:** `src/components/scene/SceneIsland.tsx`, `src/components/scene/HeartScene.tsx`, `src/components/scene/framing.ts`, `src/components/scene/scene.css`, `src/styles/lesson.css`, `tests/e2e/scene.spec.ts`, `tests/e2e/a11y.spec.ts`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e`
- **Status:** verified
- **Primary evidence:** `verification/phase-3.md`; primary browser evidence in `verification/browser.md` is not delegated to the phase subagent.

- [x] **P3.T1: Add inline guided interaction guidance** — covers: FR-2, FR-7, AC-3
  - [x] Explain selecting a landmark/highlighted structure and scrolling to its prose; do not mention drag/orbit.
  - [x] Associate guidance with the scene controls for assistive technology and preserve visible keyboard focus.
- [x] **P3.T2: Apply responsive camera-first framing** — covers: FR-1, FR-8, AC-1, AC-2
  - [x] Adapt camera distance/framing to viewport aspect without scaling the model to fake fit.
  - [x] Preserve desktop presence and safe mobile bounds while keeping hotspot controls and prose usable.
- [x] **P3.T3: Remove idle breathing and soften ambient motion** — covers: FR-3, NFR-2, NFR-3, AC-4
  - [x] Remove continuous group-scale breathing and reduce camera/particle intensity or speed.
  - [x] Keep motion optional, interruptible, and subordinate to reading and hotspot focus.
- [x] **P3.T4: Play manifest-driven hotspot animations** — covers: FR-4, NFR-1, AC-4, AC-5
  - [x] Map active hotspot changes to declared GLTF clips using shared generic code.
  - [x] Replay on refocus, stop/reset on interruption or reduced motion, and dispose mixer/actions cleanly.
- [x] **P3.T5: Preserve guided focus and fallback semantics** — covers: FR-5, FR-7, FR-9, NFR-2, NFR-4, AC-6
  - [x] Keep hotspot/prose/tutor focus synchronization unchanged and do not add orbit controls.
  - [x] Ensure WebGL matches framing, while reduced-motion and final poster modes remain static and complete.
  - [x] Add deterministic E2E assertions for guidance, focus, animation state, and fallback behavior.

**Result:** verified
**Checkpoint:** f65f940
**Evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/phase-3.md
**Browser evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/browser.md

## Phase 4: Viewport and renderer acceptance coverage

- **Goal:** Prove the approved behavior across both lessons, target viewports, reduced motion, and all renderer tiers.
- **Depends on:** Phase 3
- **Covers:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8, AC-9, NFR-2, NFR-3, NFR-4, NFR-6
- **Touches:** `tests/integration/glb-manifest.test.ts`, `tests/integration/content-contract.test.ts`, `tests/e2e/scene.spec.ts`, `tests/e2e/a11y.spec.ts`
- **Verification:** `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e && pnpm test:a11y`
- **Status:** verified
- **Primary evidence:** `verification/phase-4.md`; final browser pass remains required at review and after any fix round.

- [x] **P4.T1: Strengthen framing and asset contract tests** — covers: AC-1, AC-2, AC-5, AC-7
  - [x] Assert safe projected bounds for desktop/mobile aspect ratios at rest and across hotspots.
  - [x] Validate every declared animation against exported GLB clips and hotspot IDs.
- [x] **P4.T2: Add viewport and motion E2E coverage** — covers: AC-1, AC-2, AC-3, AC-4, AC-6
  - [x] Exercise both lessons at 1024×768, 1280×800, and 390×844.
  - [x] Assert guidance, safe stage bounds, focus changes, animation replay, and static reduced-motion/poster behavior.
- [x] **P4.T3: Verify accessibility, fallback, and unchanged budgets** — covers: AC-6, AC-8, AC-9, NFR-6
  - [x] Extend accessibility checks to both lesson stages and keyboard guidance.
  - [x] Confirm clean console behavior and unchanged Lighthouse thresholds/retries.
  - [x] Confirm the final diff contains no deploy/config/threshold, secret, production-data, or unrelated feature changes.

**Result:** verified
**Checkpoint:** 8e28478
**Evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/phase-4.md
**Browser evidence:** conductor/tracks/20261127-scene-stage-reframing/verification/browser.md (fresh pass required at review)

## Verification notes

- The known `oxfmt` exit-5 flake is handled by confirming `pnpm exec oxfmt --check .` directly and rerunning the chain once; thresholds and configuration remain unchanged.
- Lighthouse keeps its existing single retry.
- Asset generation remains recipe-driven; GLBs and posters are never hand-patched.
- Review fixes, if any, will be appended as separate phases and receive fresh browser verification.
