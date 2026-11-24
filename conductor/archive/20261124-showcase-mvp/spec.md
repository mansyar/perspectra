# Showcase MVP — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Deliver the first end-to-end slice of Perspectra: a zero-JS Astro catalog leading into one interactive, topic-agnostic 3D heart lesson with six hotspots, a course-grounded AI tutor, a real mastery model, offline progress, and a verifiable Open Badge 3.0. It exists to prove the architecture and the demo story, not to ship a content library.

## Problem / Motivation

Existing LMSs win on distribution, not craft — poor UX is the top reason learners switch. A portfolio piece needs to demonstrate novel engineering (3D interaction, local-first behavior, grounded AI) without becoming an infrastructure project. Without a bounded vertical slice, the "wow" stays a mockup and none of the architectural claims are testable.

## Goals & Success Metrics

- **Goal:** A reviewer can open a URL in any modern browser and, within three minutes, see and feel the full learning loop.
- **Metric:** Lighthouse ≥95 on catalog and lesson prose, with zero JS on the static shell.
- **Metric:** All acceptance criteria below pass, with 80% coverage on logic-bearing modules.
- **Metric:** Complete demo path with no installed software and ≤$10/mo running cost.

## Scope

### In Scope

- One heart lesson (~6 hotspots), one scene, procedural Blender asset + committed GLB/poster.
- Hotspot↔prose two-way binding.
- Open access: static MDX excerpt per hotspot + 2 tutor questions via anonymous Workers KV session.
- Better Auth (GitHub, Google, email/password) unlocking the full pedagogical suite.
- Grounded tutor with citations, Socratic mode, quiz generation, and remediation links.
- BKT + FSRS mastery heatmap; offline progress queue.
- Open Badge 3.0 credential + public verifier page.
- AI disclosure, privacy note, reduced-motion support, WCAG 2.2 AA, English-only with i18n-ready structure.

### Out of Scope

- Multiple lessons, avatars, VR/WebXR, blockchain, general chatbot, proctoring.
- LTI parity, full event sourcing, R2 CDN, analytics dashboard, mobile-native 3D quality.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Static catalog lists one live lesson card and clearly labeled coming-soon placeholders | must |
| FR-2 | A single Astro `lessons` content collection with Zod-validated frontmatter carrying a generic scene manifest (model, camera, hotspots); build fails on invalid or missing hotspot IDs | must |
| FR-3 | R3F scene island renders the committed heart GLB with named-mesh→hotspot mapping, WebGPU→WebGL→poster fallback, heartbeat pulse and flow particles | must |
| FR-4 | Two-way binding: clicking a 3D hotspot highlights/scrolls its prose; scrolling prose sets the active hotspot via a shared store, triggering camera tween and emissive pulse | must |
| FR-5 | Anonymous visitors see a static MDX excerpt per hotspot and may ask exactly 2 tutor questions, counted by anonymous session ID in Workers KV | must |
| FR-6 | Better Auth supports GitHub, Google, and email/password; authenticated users gain the full pedagogical suite | must |
| FR-7 | Tutor answers are grounded in retrieved MDX chunks (hybrid BM25+vector in pgvector), streamed, and include clickable citations to exact sections/hotspots that also move the scene | must |
| FR-8 | Tutor guardrails: cosine threshold, cheap intent router, scope-locked layered prompt, 16-turn cap, per-user/IP quotas, $10/mo kill switch, and Worker-side citation validation before streaming | must |
| FR-9 | Quiz generation with rubric grading and remediation links back to hotspot anchors | must |
| FR-10 | BKT + FSRS mastery model drives a visible heatmap, next-best hotspot recommendation, and review cards | must |
| FR-11 | Offline progress is queued append-only in IndexedDB and auto-synced on reconnect with last-write-wins | must |
| FR-12 | OB3 credential is issued at the configured mastery threshold; a separate public verifier page validates it | must |
| FR-13 | A deterministic `assets/heart/build_heart.py` Blender recipe produces the GLB and poster; the recipe may be authored, inspected, and iterated interactively through the Blender MCP bridge while Blender is running, but the checked-in script and its exported GLB/poster remain the versioned source of truth. An `ASSET_CONTRACT.md` fixes the six hotspot IDs and export rules; all assets are committed | must |
| FR-14 | Trust surfaces: AI disclosure, privacy note, reduced-motion behavior, keyboard-reachable hotspots, WCAG 2.2 AA, English-only with i18n-ready structure | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Lighthouse ≥95 on catalog and prose; static shell ships 0 KB JS; 3D loads only on interaction |
| NFR-2 | Heart GLB <1 MB, <100 draw calls, KTX2/Draco only if needed; poster shown until scene is ready |
| NFR-3 | Running cost ≤$10/mo at portfolio scale (Neon free, Workers/KV free, metered LLM with kill switch) |
| NFR-4 | Secrets stay server-side; Worker rate limiting; session-scoped data access; no client-side API keys |
| NFR-5 | WCAG 2.2 AA, reduced-motion support, desktop-first 3D with fully usable mobile prose |
| NFR-6 | No single failure (WebGPU, WebGL, LLM, quota, DB, auth) blocks completion of the prose lesson |
| NFR-7 | 80% line and branch coverage on mastery, retrieval/scoring, prompt assembly, validation, badge logic |
| NFR-8 | MIT code; CC0/OFL assets; no share-alike geometry shipped |
| NFR-9 | Topic-agnostic renderer: adding a topic requires MDX + GLB + frontmatter, zero code changes |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Catalog renders one live card + placeholders as static HTML with no client JS | FR-1, NFR-1 |
| AC-2 | `pnpm build` fails when a `data-hotspot` lacks a matching manifest ID or manifest frontmatter is invalid | FR-2 |
| AC-3 | Scene loads in a WebGPU browser, falls back to WebGL, then to poster when both are unavailable; lesson remains completable in all three | FR-3, NFR-6 |
| AC-4 | GLB named meshes exactly match the six hotspot IDs and file size/draw-call budgets pass; any MCP-assisted edits are baked back into the deterministic recipe | FR-3, FR-13, NFR-2 |
| AC-5 | Clicking a hotspot scrolls and highlights its prose; scrolling prose updates the active hotspot and camera target | FR-4 |
| AC-6 | Anonymous session can ask 2 questions; the 3rd returns a graceful sign-in prompt plus static excerpt | FR-5, NFR-6 |
| AC-7 | GitHub, Google, and email/password sign-in each succeed; session grants full suite | FR-6 |
| AC-8 | Tutor answer contains at least one valid citation; clicking it scrolls prose and moves the camera | FR-7 |
| AC-9 | Off-topic question is rejected before generation; invalid citation is rejected before streaming | FR-8 |
| AC-10 | 17th turn in a session and per-day quota each return the configured graceful limit message | FR-8 |
| AC-11 | Quiz produces graded answers with remediation links that resolve to real hotspot anchors | FR-9 |
| AC-12 | Mastery heatmap updates after quiz; FSRS scheduling produces a due review card | FR-10 |
| AC-13 | Progress queued offline appears on the server after reconnect with no duplicate events | FR-11 |
| AC-14 | Badge is issued only above the mastery threshold and validates on the public verifier page | FR-12 |
| AC-15 | Tampered badge fails verification | FR-12, NFR-4 |
| AC-16 | Build-time check proves a second topic could be added with MDX + GLB only | FR-2, NFR-9 |
| AC-17 | `pnpm coverage` reports ≥80% on the configured logic-bearing modules | NFR-7 |
| AC-18 | Lighthouse performance ≥95 on catalog and lesson prose | NFR-1 |
| AC-19 | Reduced-motion setting disables camera tweens/particles; all hotspots keyboard-reachable | FR-14, NFR-5 |
| AC-20 | AI disclosure and privacy note are visible before first tutor use | FR-14 |
| AC-21 | No API keys or secrets appear in client bundles | NFR-4 |
| AC-22 | Asset license audit records MIT/CC0/OFL for all shipped dependencies and assets | NFR-8 |

## Edge Cases

- No WebGPU and no WebGL; GLB load failure or missing named mesh.
- LLM timeout or provider outage; quota exhausted; retrieval below threshold; malformed citation.
- Auth callback failure; offline queue replay conflict; concurrent sessions on the same account.
- Badge tampering; reduced-motion preference; narrow viewport; MDX hotspot mismatch at build time.

## Dependencies

- **Tracks:** none
- **External:** Neon Postgres (pgvector/HNSW), Cloudflare Workers + KV, GitHub/Google OAuth apps, one LLM provider key, Node 24 + pnpm, Blender + MCP add-on (optional, authoring only; not needed to build or run the app).

## Open Questions & Assumptions

- **Question:** Domain name deferred; `workers.dev` first (from product.md).
- **Question:** Future topic set beyond the heart is undecided; architecture stays topic-agnostic (from product.md).
- **Assumption:** BKT mastery threshold 0.85; FSRS default desired retention; 16 turns/session; 60 requests/day and 150k tokens per user/IP; $10/mo kill switch — all previously agreed and configurable.
- **Assumption:** No git remote yet, so PR/merge steps wait until one is added.
- **Assumption:** Accent color and OFL font pair chosen during implementation.
- **Assumption:** No dedicated designer; visual craft comes from code-driven 3D and a consistent design system.

## References

- `conductor/product.md`
- `conductor/tech-stack.md`
- `conductor/product-guidelines.md`
- `conductor/workflow.md`
- Prior research on Astro islands, WebGPU, hybrid RAG, BKT/FSRS, and Open Badges 3.0 from the project's planning sessions.
