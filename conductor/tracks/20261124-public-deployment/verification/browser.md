# Browser verification — Public deployment

Date: 2026-11-25

Origin: `https://perspectra-api.m-ansyarafi.workers.dev`

Tool: OpenCode in-app Chrome browser (`browse` skill), explicit tab `1990715719`.

## Result

**PASS** for the deployed public visual slice and console health.

## Checks

- Navigated to `/lessons/heart/`; title was `The Human Heart — Perspectra`.
- Poster source was `/assets/heart/heart-poster.webp`; image completed at 960×960.
- Before opt-in, the illustrated poster/prose path rendered with the tutor dock.
- Clicked `Start interactive 3D view`; scene reached `data-scene-ready="true"`.
- Canvas was present, poster became hidden after readiness, renderer was `webgpu`, and active
  context was `left_ventricle`.
- Screenshot review showed the complete, framed, correctly lit red/pink/blue/purple heart.
- Console capture started before the interaction and returned no error entries.
- Production Playwright separately passed renderer step-down, poster fallback, delayed-GLB poster
  persistence, accessibility, keyboard, reduced-motion, tutor, learning-loop, and Lighthouse checks.

## Related evidence

- Real-service production smoke: 13/13 checks in `phase-4.md`.
- Production E2E: 17/17 tests via `pnpm test:production`.
- Lighthouse: catalog 1.00 performance; lesson 0.99 performance; accessibility 1.00 on both.

## Limitations

- Social OAuth callbacks were not browser-verified. GitHub was explicitly deferred by the user;
  Google client creation did not complete. Email/password authentication passed the real-service smoke.
