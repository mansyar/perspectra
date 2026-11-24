# Product Definition: Perspectra

## Vision

Perspectra is a 3D-first learning platform where lessons are MDX scripts that drive interactive 3D scenes. A course-grounded AI tutor explains concepts at the learner's current point of focus, while a real mastery model tracks progress and verifiable credentials recognize achievement. It is topic-agnostic by design: subject matter lives in content, never in code. The first demonstration lesson is a stylized human heart with six hotspots.

## Problem

Most LMS platforms win on distribution, not craft — learners face passive video-and-quiz interfaces, poor UX (88% cite it as a reason to switch), and no spatial understanding. Portfolios showcasing LMS work are typically CRUD demos that look generic. There is an opportunity to demonstrate that a learning experience can be beautiful, interactive, performant, and pedagogically grounded at once.

## Target Users and Personas

- **Curious learner / reviewer (primary):** A visitor exploring the heart lesson in their own browser, and a recruiter or engineer evaluating the quality of the implementation. They care about a runnable, visually striking demo with readable code.
- **Content author (secondary, future):** You, and later other educators, who want to add topics by writing MDX and dropping in a GLB, with no code changes.

## Core Use Cases

1. Browse a catalog of 3D lessons; open one with a zero-JS static shell that upgrades to an interactive scene.
2. Explore a scene by scrolling prose (camera flies to hotspots) or clicking 3D hotspots (prose highlights).
3. Open-access: read a static MDX excerpt for each hotspot and ask the tutor up to two questions via an anonymous Workers KV session.
4. Logged-in: full pedagogical suite — cited answers, Socratic mode, quiz generation, mastery heatmap, FSRS review cards, and badges.
5. Earn an Open Badge 3.0 credential and verify it on a separate public page.
6. Offline/throttled: progress queues locally and syncs on reconnect.
7. Author a new topic by adding MDX frontmatter + a GLB with named meshes; build-time validation guarantees hotspot consistency.

## Goals & Success Metrics

- **Primary:** Demonstrated experience — a reviewer can run the demo in any browser, see 3D + AI + mastery working together, and read clean, well-structured code.
- Secondary: Learning gains (mastery deltas, quiz performance), performance (Lighthouse green, small JS budget), and cost discipline (~$0–10/mo at portfolio scale).

## Core Flows

- **Open access:** Catalog → lesson poster → "Launch 3D" → static hotspot info → up to 2 tutor questions → sign-up prompt.
- **Logged in:** Catalog → lesson → hotspot exploration → tutor Q&A with citations → Socratic follow-up → quiz → mastery heatmap update → FSRS card → badge → verifier.
- **Authoring:** MDX + GLB + frontmatter → build-time validation → static HTML + embedded chunks → pgvector.

## Scope & Non-Goals

**In:** One flagship heart lesson (~6 hotspots: left/right ventricle, aorta, pulmonary artery, mitral/aortic valve); procedural Blender asset pipeline; hotspot↔prose two-way binding; grounded tutor; BKT + FSRS mastery; OB3 badge + verifier; thin offline progress queue.

**Out:** Multiple lessons at launch; avatar tutor; VR/WebXR; blockchain credentials; general-purpose chatbot; proctoring; LTI/gradebook/admin parity; full event sourcing.

## Constraints

- Solo developer with an agent available 24/7 — favor depth over breadth and avoid operational overhead.
- Budget $0–10/mo; free tiers only, with metered LLM behind a $10 kill switch.
- Reviewer's browser is the demo environment — no install, no special hardware; WebGPU with WebGL/poster fallback.
- Content is authored in MDX; 3D assets are procedural, checked into the repo.

## Integrations & External Dependencies

- LLM provider configurable via env (Gemini 2.5 Flash or GPT-4.1 mini).
- Auth via Better Auth with GitHub + Google OAuth and email/password.
- Neon Postgres + pgvector/HNSW; Hono on Cloudflare Workers; anonymous sessions in Workers KV.
- 3D assets (GLB, poster) and MDX are committed to the repo; R2 is deferred as a future CDN option.
- Z-Anatomy / BodyParts3D as anatomical reference only (not shipped geometry, to avoid CC BY-SA share-alike).

## Risks & Unknowns

- Procedural semi-realistic modeling may look too abstract — mitigate with overnight render-and-compare loops.
- WebGPU availability varies — fallback chain to WebGL then poster.
- LLM latency/cost — streaming, cheap models, turn caps, quotas.
- Topic lock-in risk — mitigated by the GLB named-mesh contract and MDX-based content.

## Roadmap to Full Version

Planned phases now live in [conductor/roadmap.md](./roadmap.md). Phase A (Showcase MVP) is complete and archived in [conductor/archive/20261124-showcase-mvp](./archive/20261124-showcase-mvp/index.md).

## Open Questions & Assumptions

- Domain name deferred (workers.dev first); repo/slug `perspectra` assumed.
- Exact full-topic set beyond the heart is undecided; the architecture supports any topic.
- No dedicated designer — visual craft comes from code-driven 3D and a consistent design system.
