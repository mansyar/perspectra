# Product Guidelines: Perspectra

## Voice and Tone

- **Clear, confident, expert-but-approachable.** Explain precisely without jargon overload; be enthusiastic about the subject, never condescending.
- Prefer short, direct sentences. Define technical or anatomical terms inline on first use.
- Tutor answers are grounded and cited — confidence comes from evidence, never from hedging or invention. If the course material does not contain the answer, say so plainly.
- Error and empty states are helpful and calm, never playful or alarming.

## UX Principles (non-negotiable)

1. **Visual-first: show, then explain.** The 3D scene is the primary explanation medium; prose and the tutor support it.
2. **Progressive disclosure.** Open access gives a static excerpt and two tutor questions; logging in unlocks depth. Never overwhelm a first-time visitor.
3. **Two-way hotspot↔prose binding.** Scrolling prose moves the camera; clicking a 3D hotspot highlights prose and retargets the tutor.
4. **Performance is a feature.** Keep the static shell JavaScript-free, respect bundle budgets, and keep Lighthouse green.
5. **Graceful degradation.** WebGPU → WebGL → poster; offline progress queue; a static fallback for every interactive feature.

## Accessibility Requirements

- Target **WCAG 2.2 AA** with explicit **reduced-motion** support.
- All hotspots are keyboard-navigable with visible focus and descriptive labels; every interactive feature has a semantic prose equivalent.
- Provide alt text / textual descriptions for 3D visuals and respect `prefers-reduced-motion` for camera flights and pulses.
- Document the conformance target and known limitations in the README.

## Design System Foundations

- **Dark, cinematic theme** with a **single accent color** driving hotspots, focus, and CTAs; a **light reading surface** for lesson prose.
- **Design tokens in CSS custom properties** — color, spacing, typography, and motion — shared by the Astro UI and the R3F scene.
- **Custom font pairing**: a geometric display face for headings and a highly readable body face, self-hosted and OFL licensed.
- **Consistent motion language**: shared easing/duration tokens for camera eases, hotspot pulses, and tutor streaming.

## Content Style (lesson MDX)

- **Concise, layered, hotspot-anchored.** A short overview per hotspot lives in MDX; deeper explanation is delivered by the tutor.
- Every content section has a stable ID and a clear citation anchor; the renderer never learns the subject matter.
- Plain language; define jargon inline; one idea per section. Tone matches the voice above.
- New topics are pure content: MDX frontmatter + a GLB with named meshes matching hotspot IDs. Build-time validation enforces consistency.

## Platform Conventions

- **Responsive, desktop-first** 3D with fully usable mobile prose; mobile gets lighter scene settings and a tappable hotspot list.
- Follow web conventions: browser back/forward works, links are links, focus order is logical.
- Demo target is any reviewer's browser — no install, no special hardware.

## Internationalization & Localization

- English only for the MVP; structure content so translation is a later content task.
- No user-facing strings hardcoded in code — keep them in content files or token dictionaries.

## Legal, Compliance & Trust

- Clearly disclose AI-generated answers: what data is sent to the provider and how to delete it.
- Open Badges 3.0 credentials are verifiable without an account.
- Ship **MIT-licensed code** and **CC0/OFL assets**; credit anatomical reference sources without redistributing their geometry (CC BY-SA).
- Publish the WCAG conformance statement and known limitations in the README.

## Open Questions & Assumptions

- Exact accent color and font faces are chosen during implementation, within the tokens system above.
- No dedicated designer — visual craft comes from code-driven 3D and consistent tokens.
- Compliance scope is portfolio-scale; a formal legal review is out of scope.
