# 3D Stage Reframing — Specification

## Overview

Reframe both authored lessons so the 3D model is visibly larger, safely framed, and easier to understand. Add accurate inline interaction guidance, remove idle model breathing, soften ambient motion, and support brief manifest-driven animations triggered by hotspot focus. Existing Heart and Earth Interior assets may be refined through their reproducible recipes, with regenerated GLB/poster outputs.

## Problem / Motivation

Perspectra’s primary promise is a visual-first learning experience. The current stage uses a generic 4:3 viewport, per-lesson camera manifests, continuous model-scale breathing, flowing particles, and only a generic start button plus landmark pills. It does not explain how scene focus relates to prose, and the current framing can leave the model underusing the available stage.

Because 3D is the primary explanation medium, this weakens the reviewer’s first impression and makes the scene feel less intentional than the grounded tutor, mastery, and verification flows now do.

## Goals & Success Metrics

- **Goal:** Make both live lesson models visibly larger without clipping or distortion.
- **Metric:** Automated bounds checks plus primary browser evidence at 1024×768, 1280×800, and 390×844.
- **Goal:** Make scene interaction understandable without adding free-orbit complexity.
- **Metric:** Inline guidance accurately explains hotspot/landmark selection and prose scrolling; keyboard and screen-reader checks pass.
- **Goal:** Create calmer, purposeful motion.
- **Metric:** No idle model breathing; gentler camera/ambient motion; brief hotspot-triggered animations replay on focus change and stop for reduced-motion/poster modes.
- **Goal:** Preserve topic-agnostic architecture and reproducible assets.
- **Metric:** Animation/framing behavior is manifest-driven, and updated recipes regenerate the shipped GLB/poster outputs.

## Scope

### In Scope

- Camera-first framing and stage layout for Heart and Earth Interior.
- Responsive framing: stronger desktop presence, safe mobile fit.
- Inline, accessible interaction guidance for the existing guided navigation model.
- Removal of idle model breathing and reduction of ambient/camera motion.
- Optional animation clips and hotspot triggers declared in lesson manifests/content.
- Shared renderer support for brief, interruptible hotspot animations.
- Refinement of existing Heart/Earth models, materials/lighting, and posters.
- Updates to deterministic asset recipes and regenerated outputs.
- Framing, manifest-validation, animation, reduced-motion, fallback, and viewport tests.
- Primary browser verification across both lessons and renderer tiers.
- Documentation synchronization where behavior or known limitations change.

### Out of Scope

- New lessons, topics, replacement model sources, or additional scene props.
- Free orbit, drag/pinch rotation, guided-tour overlays, coach marks, VR/WebXR.
- General-purpose animation tooling or a visual animation editor.
- Tutor, assessment, mastery, cohort, authentication, or credential changes.
- Full per-geometry screen-reader narratives; the existing documented limitation remains unless separately scheduled.
- Deployment, custom domains, secrets, production data resets, configuration changes, or Lighthouse threshold/retry changes.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Each authored lesson uses camera/framing values that make its model visibly larger than the current baseline while keeping the whole intended model safely in view. | must |
| FR-2 | The scene presents concise inline guidance explaining hotspot/landmark selection and prose scrolling. Guidance is visible, keyboard reachable, and available to assistive technology. | must |
| FR-3 | Default scenes remove continuous model-scale breathing and use gentler camera easing and ambient flow. | must |
| FR-4 | Lesson manifests may declare animation clips and hotspot triggers. Shared renderer code plays a brief, interruptible animation on focus change and replays it when that hotspot is focused again. | must |
| FR-5 | Reduced-motion mode and final poster fallback are static while preserving framed visuals, prose, hotspot controls, and tutor access. | must |
| FR-6 | Existing Heart and Earth Interior assets may be refined, including animation clips where useful. Deterministic recipes and shipped GLB/poster outputs are updated together. | must |
| FR-7 | Guided navigation remains authoritative: prose scrolling and hotspot/landmark activation update focus, prose, tutor scope, and animation without blocking input. | must |
| FR-8 | Desktop framing maximizes useful model presence; mobile framing fits safely without clipping, horizontal overflow, or covering prose/controls. | must |
| FR-9 | WebGPU, WebGL, and poster tiers preserve equivalent framing and lighting intent; poster crops are regenerated when needed. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Runtime framing/animation behavior remains topic-agnostic and manifest/content-driven; no new Heart- or Earth-specific runtime branches. |
| NFR-2 | Controls retain visible focus and keyboard access. Motion conveys no essential information by itself, and `prefers-reduced-motion` is respected. |
| NFR-3 | Existing Lighthouse budgets, retry policy, zero-JavaScript catalog, and deferred heavy-scene loading remain unchanged. |
| NFR-4 | The WebGPU → WebGL → poster fallback ladder remains reliable, with no unexpected console errors. |
| NFR-5 | Asset changes remain reproducible, provenance-compliant, and free of new external dependencies unless explicitly approved. |
| NFR-6 | No secrets, deployment configuration, production data, custom-domain settings, or verification thresholds change. |
| NFR-7 | Motion and layout reuse existing design tokens and conventions; no unrelated UI refactor is included. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | At 1280×800 and 1024×768, both lessons show a documented visible increase in model presence versus baseline, with no intended geometry clipped. | FR-1, FR-8 |
| AC-2 | At 390×844, both models fit safely, hotspot controls remain tappable, prose remains readable, and no horizontal overflow occurs. | FR-8 |
| AC-3 | Inline guidance appears before interaction, accurately describes guided selection/scrolling, is keyboard reachable, and does not claim drag/orbit behavior. | FR-2, FR-7 |
| AC-4 | Normal-motion scenes have no model-scale breathing; camera/ambient motion is gentler; hotspot animations are brief, interruptible, and replay on refocus. | FR-3, FR-4 |
| AC-5 | Manifest tests accept valid clips/triggers, reject invalid references, tolerate lessons without optional animations, and confirm no new topic-specific runtime branch. | FR-4, NFR-1 |
| AC-6 | Reduced-motion and poster modes are static and complete; WebGL retains equivalent framing; prose and tutor controls remain usable. | FR-5, FR-9, NFR-2, NFR-4 |
| AC-7 | Updated asset recipes run successfully and regenerate the committed Heart/Earth GLB and poster outputs used by the app. | FR-6, NFR-5 |
| AC-8 | `pnpm verify`, smoke, and E2E pass with unchanged Lighthouse budgets; primary browser evidence covers both lessons at 1024/1280/390 and relevant fallback modes. | NFR-3, NFR-4 |
| AC-9 | Final diff introduces no secrets, deploy/config/threshold changes, production-data operations, new topics, or unrelated feature work. | NFR-6 |

## Edge Cases

- Rapid hotspot changes interrupt and replace animation cleanly.
- Repeated focus replays the short animation without accumulating timers or listeners.
- Missing optional animation metadata leaves a valid static scene.
- Invalid clip/trigger references fail build-time validation with a useful error.
- Reduced-motion preference changes while the page is open.
- WebGPU failure, WebGL failure, and final poster fallback.
- Poster crop and interactive camera disagree on model bounds.
- Mobile landscape and narrow widths produce safe framing.
- Interaction starts before the scene has hydrated or finished loading.
- Asset regeneration fails without silently committing partial outputs.

## Dependencies

- **Tracks:** None.
- **External:** Existing Blender/Python asset pipeline and local browser verification; no credentials or new service.

## Open Questions & Assumptions

- **Assumption:** “Both authored lessons” means Heart and Earth Interior.
- **Assumption:** Camera-first tuning may use per-lesson manifest values, but shared runtime code remains generic.
- **Assumption:** The full asset pass refines existing assets only; it does not replace model sources or add topics.
- **Assumption:** Authored animations are hotspot-triggered, one-shot, brief, and interruptible. Exact timing is set during visual implementation.
- **Assumption:** Guided hotspot/prose focus remains the navigation model; orbit controls are not added.
- **Assumption:** Existing performance budgets, retries, deployment rules, and production restrictions remain unchanged.

## References

- `conductor/roadmap.md` — RM-10.
- `conductor/product.md` and `conductor/product-guidelines.md`.
- `src/components/scene/`, `src/styles/lesson.css`, and lesson scene manifests.
- Archived reviewer-onboarding follow-up identifying RM-10.
- Existing deterministic asset recipes and generated GLB/poster outputs.
