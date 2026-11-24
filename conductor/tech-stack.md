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
- 3D assets (GLB, poster) and MDX live **in the repo**, per your decision; **R2 is deferred** as a future CDN option, not part of the MVP.
- Schema: `users`, `lessons`, `hotspots`, `learning_events` (append-only), `mastery`, `fsrs_cards`, `badges`; all Zod-validated at boundaries.

## External Services & APIs
- LLM adapter configurable via env: **Gemini 2.5 Flash** or **GPT-4.1 mini**; streaming responses; ~5–6k input tokens/request, 16-turn cap, $10/mo kill switch.
- GitHub + Google OAuth; Neon; Cloudflare Workers/KV; GitHub Actions.
- Embeddings via the same provider's embedding model (text-embedding-3-small or Gemini embedding).

## Hosting & Deployment
- Static Astro output served by Cloudflare; Hono API on **Cloudflare Workers** via **Wrangler 4.167.0**; **@cloudflare/workers-types 5.20261123.1**.
- **workers.dev** subdomain first; custom domain deferred.
- **GitHub Actions** CI on pull requests only: a `verify` job (lint, format, typecheck, Vitest + coverage gate, Astro build) and an `e2e` job (Playwright smoke, E2E, axe and Lighthouse budgets with a build step for `astro preview`).

## Tooling
- **Vitest 5.1.1 + @vitest/coverage-v8 5.1.1** for unit tests; **@playwright/test 1.65.1** for smoke, E2E, axe accessibility and Lighthouse performance specs; **Lighthouse 13.6.0**, **chrome-launcher 1.2.0**, **@axe-core/playwright 4.14.0** for audited evidence.
- Coverage gate applies to new/changed code.

## Local Development
- `pnpm install`, `pnpm dev` (Astro + `wrangler dev`), `.env.example` with all provider keys, Neon free branch, seed script for the heart lesson.
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

## Open Questions & Assumptions
- Custom domain deferred; exact embedding model picked at implementation time.
- R2 and multi-topic authoring tooling are post-MVP; Playwright and Lighthouse are in the MVP verification suite.
- oxlint does not lint `.astro` templates — only script blocks (accepted limitation).
