# Technology Stack: Perspectra

## Languages & Runtimes
- **TypeScript 6.0.3** (pinned — TS 7 is not yet supported by Astro; latest 6.x line).
- **Node.js 24 LTS** locally (Astro requires ≥22.23.4); **Cloudflare Workers V8 isolate** runtime for the API. Bun is not required.
- **pnpm 12.23.0** as package manager and lockfile.

## Frameworks & Major Libraries
- **Astro 7.4.13** (latest stable) — Vite-powered static shell, MDX content collections, near-zero JS by default; `client:*` islands for interactivity.
- **@astrojs/mdx 8.1.6**, **@astrojs/react 7.1.9**, **@astrojs/compiler-rs 0.5.3** (required by oxfmt for `.astro` formatting).
- **React 19.3.1 / react-dom 19.3.1**, **three 0.187.0**, **@react-three/fiber 10.0.0-alpha.6** (alpha tag — first-class WebGPU; canary commits deliberately avoided), **@react-three/drei 10.7.9**, **zustand 5.1.0** for the single 3D island. WebGPU → WebGL → poster fallback chain; `useGLTF` for named-mesh GLBs.
- **Hono 4.13.21** on Cloudflare Workers for all API routes: tutor proxy, quiz, mastery, badge issuance, rate limiting, kill switch.
- **Drizzle ORM 0.45.4** (Apache-2.0) with **drizzle-kit 0.31.11** and **Zod 4.6.7** schemas; **Better Auth 1.7.27** (MIT) with Drizzle adapter, GitHub + Google OAuth and email/password.
- **ts-fsrs 6.0.1** (MIT) spaced repetition scheduler and a small BKT implementation for mastery. The npm package named `fsrs` is an unrelated filesystem utility and is not used.
- **oxlint 1.95.0** + **oxfmt 0.80.0**; `tsc --noEmit` / `astro check` for typechecking.

## Data Stores & Schemas
- **Neon Postgres** (free tier, scale-to-zero) with **pgvector + HNSW** for MDX chunk embeddings; **@neondatabase/serverless 1.2.1** and **postgres 4.1.1** drivers.
- **Workers KV** for anonymous sessions (2 free tutor questions) and rate-limit counters.
- 3D assets (GLB, deterministic Blender recipe, ~7.2 KB WebP poster, retained PNG source) and MDX live **in the repo**, per your decision; **R2 is deferred** as a future CDN option, not part of the MVP.
- Schema: `users`, `lessons`, `hotspots`, `learning_events` (append-only), `mastery`, `fsrs_cards`, `badges`; all Zod-validated at boundaries.

## External Services & APIs
- **Gemini-only LLM adapter** via env: production chat uses **gemini-3.5-flash-lite** (configurable through `LLM_MODEL`), `x-goog-api-key`, temperature 1, minimal thinking, and a 400-token output cap; streaming tutor responses, ~5–6k input tokens/request, 16-turn cap, $10/mo kill switch.
- **gemini-embedding-2** at exactly 1536 dimensions, with Gemini query/document prefixes, strict dimension checks, unit normalization, and batch ingestion. Gemini and OpenAI embedding spaces are never mixed.
- Google OAuth and email/password are verified in production; GitHub OAuth remains deferred by explicit user choice. Neon; Cloudflare Workers/KV; GitHub Actions.

## Hosting & Deployment
- **Single-origin Cloudflare Workers deployment**: Workers Static Assets serve `dist/`; the Worker handles `/api/*` and `/health`, then falls back to the `ASSETS` binding. **Wrangler 4.167.0**; **@cloudflare/workers-types 5.20261123.1**.
- Public production origin: `https://perspectra-api.m-ansyarafi.workers.dev`; manual deploy; custom domain and automatic deployment remain deferred.
- Neon WebSocket `Pool`/Drizzle clients are request-scoped and closed through Hono `executionCtx.waitUntil`; bindings or pools are never reused across Cloudflare requests. Better Auth session schema includes nullable `ipAddress` and `userAgent`.
- **GitHub Actions** CI on pull requests only: a `verify` job (lint, format, typecheck, Vitest + coverage gate, Astro build) and an `e2e` job (Playwright smoke, non-performance E2E and axe, then serial `@perf` Lighthouse budgets with one worker, with a build step for `astro preview`). `pnpm verify:full` uses the same split; score thresholds and the single Lighthouse retry are unchanged.

## Tooling
- **Vitest 5.1.1 + @vitest/coverage-v8 5.1.1** for unit tests; **@playwright/test 1.65.1** for smoke, E2E, axe accessibility and Lighthouse performance specs; **Lighthouse 13.6.0**, **chrome-launcher 1.2.0**, **@axe-core/playwright 4.14.0** for audited evidence. `E2E_BASE_URL` enables the same suite against the deployed workers.dev origin.
- Coverage gate applies to new/changed code.

## Local Development
- `pnpm install`, `pnpm dev` (Astro + `wrangler dev`), `.env.example` with all provider keys, Neon free branch, content-driven seed script for all MDX lessons.
- No containers required.

## Constraints
- MIT-licensed code; assets CC0/OFL; Z-Anatomy/BodyParts3D reference-only (CC BY-SA not shipped); model weights used under their own licenses.
- Budget $0–10/mo; agent runs 24/7; reviewer browser is the demo target.
- R3F alpha is a deliberate novelty tradeoff — pin exact version, isolate WebGPU code so a later upgrade or fallback is contained.

## Rejected Alternatives
- **Next.js 16 + Bun:** Bun can't run on Workers; on Vercel Bun is Beta; vinext is beta with proxy/RSC friction; Next ships far more client JS than Astro. Revisited Nov 2026 and rejected.
- **TypeScript 7:** latest is 7.0.2 but unsupported by Astro; pinned 6.0.3.
- **Supabase:** free projects pause after 7 days; Neon + Better Auth is simpler and cheaper.
- **Turso/D1:** write contention and latency limits; D1 lacks full transactions.
- **Prisma (~600 KB engine), full event sourcing, WebXR, blockchain credentials, general chatbot:** rejected for bundle size, complexity, or lack of use case.

## Upgrade & Maintenance Policy
- Pin exact versions; Dependabot/Renovate-style monthly minor updates; keep Astro, React, R3F, and Wrangler versions in sync; re-run full verification on upgrade. Re-evaluate R3F v10 stable and TypeScript 7 support at each upgrade cycle.

## Doc Sync Notes

- **2026-11-24 (Showcase MVP):** corrected the scheduler to `ts-fsrs 6.0.1`; recorded Playwright/Lighthouse/axe as active verification tooling; confirmed the OB3 credential uses an HMAC-SHA-256 `DataIntegrityProof` at portfolio scale (no external trust framework). Product definition and product guidelines required no change.
- **2026-11-24 (Release readiness):** recorded the two-job PR-only GitHub Actions workflow, real `db:push`/`db:seed` scripts via drizzle-kit and `tsx 4.23.15`, the documented `RATE_LIMIT_KV` placeholder with `RATE_LIMIT_KV_ID` validation, `docs/DEPLOYMENT.md`, the primary-run browser verification gate, and lesson-correct badge narratives for any topic. Product definition and product guidelines required no change.
- **2026-11-25 (Public deployment):** recorded the live single-origin Workers Static Assets deployment, Gemini-only chat/embeddings (`gemini-3.5-flash-lite`, `gemini-embedding-2` at 1536 dimensions), request-scoped Neon pools, Better Auth session fields, Google/email auth with GitHub deferred, external `E2E_BASE_URL` production tests, and the optimized WebP poster. Product definition and product guidelines required no change.
- **2026-11-25 (Earth interior proof):** two lessons (heart and Earth interior) now share one generic renderer, content-driven seed/embedding pipeline, topic-agnostic tutor/quiz/mastery/badge logic, and additive production ingestion. Lighthouse verification is split into serial `@perf` runs to avoid CPU contention with parallel E2E workers without changing budgets or retries. Product definition and product guidelines required no change.
- **2026-11-26 (Reviewer onboarding & trust):** global header and dedicated `/sign-in` page reuse existing Better Auth email/password and Google endpoints with a validated same-origin `next`; anonymous mastery/quiz CTAs, truthful verifier copy, and separated coming-soon labels are covered by unit/E2E and a primary browser pass. Auth state uses cookie-backed `fetch('/api/auth/...', { credentials: 'include' })` in client islands; the catalog stays zero-JS. No new dependency, secret, deployment, or topic-specific logic. Product definition and product guidelines required no change.
- **2026-11-26 (Tutor grounding dock):** lesson chunks are generated at build time from every authored `src/content/lessons/*.mdx` into `api/src/data/lesson-chunks.ts` by `pnpm exec tsx scripts/generate-lesson-chunks.ts`, replacing the heart-only mirrored prose in the generic retrieval path. Tutor retrieval is scoped to the active hotspot (lesson-wide only with no focus), and citation validation shares the scoped allowed-ID set so off-focus chunks cannot be cited. The React tutor island stays fixed from 1024px and collapses to an Escape-closable bottom sheet below it. No new dependency, secret, deployment, threshold, or topic-specific code. Product definition and product guidelines required no change.
- **2026-11-27 (Scene stage reframing):** the shared scene manifest now declares optional named one-shot hotspot clips and triggers; the renderer uses `AnimationMixer` for brief, interruptible focus-triggered playback and stays static for reduced motion or poster fallback. Camera-only framing derives safe bounds from viewport aspect, the stage includes accessible guided-control copy, and idle model breathing is removed while ambient motion is calmed. Heart and Earth Interior recipes/contracts, GLBs, PNG sources and WebP posters were refined together; responsive framing, clip binding, replay, accessibility and renderer fallback are covered by unit, integration and E2E checks. No new dependency, secret, deployment, threshold, retry, or topic-specific runtime branch. Product definition and product guidelines required no change.

## Open Questions & Assumptions
- Custom domain and automatic deployment remain deferred; production currently uses workers.dev with manual deploy.
- R2 and heavier multi-topic authoring tooling remain deferred; two topics are live with file-based MDX, procedural assets, and the shared pipeline. Playwright and Lighthouse are in the active verification suite.
- oxlint does not lint `.astro` templates — only script blocks (accepted limitation).
