# Public deployment — Specification

## Overview

Deploy Perspectra's existing vertical slice to one public Cloudflare Workers origin. The same URL serves the Astro static build, Hono API, Better Auth, Gemini tutor and embeddings, Neon data, and the public badge verifier.

This track also adds Gemini-native embeddings, production-targeted E2E support, credential and deployment documentation, and the Conductor/README cleanup identified during status review.

## Problem / Motivation

- There is no public portfolio URL.
- The current runbook uses split Cloudflare Pages and Worker origins, creating avoidable CORS, cookie, and callback complexity.
- Gemini is selectable for chat, but embeddings still call OpenAI.
- Playwright only targets local preview.
- Conductor contains a completed RM-5 row and a stale release-readiness run file.
- README content-onboarding and evidence-path guidance is outdated.

## Goals / Metrics

1. Publish the full experience at `https://perspectra-api.<subdomain>.workers.dev`.
2. Use one same-origin deployment and one Gemini key for chat and embeddings.
3. Initialize a fresh production Neon branch and re-embed lesson content with Gemini.
4. Verify the real public flow in a reviewer's browser.
5. Keep all credentials out of git and preserve manual deployment control.

Primary metric: the public URL demonstrates the complete catalog-to-credential learning loop.

## Scope

### In scope

- Workers Static Assets serving `dist/`.
- API-first routing for `/api/*` and `/health`, with static fallback through `ASSETS`.
- Configurable Gemini Flash chat (production: `gemini-3.5-flash-lite`) and `gemini-embedding-2` embeddings at 1536 dimensions.
- Gemini-aware lesson ingestion and embedding tests.
- `E2E_BASE_URL` production mode for Playwright.
- Manual deployment runbook and credential guidance.
- Fresh Neon production setup, seed, and embedding ingest.
- Production browser, console, Lighthouse, auth, tutor, quiz/mastery, badge, and verifier checks.
- Roadmap RM-5 retirement, stale run cleanup, and README corrections.
- Public deployment URL recorded in docs and evidence.

### Out of scope

- Custom domain purchase.
- Automatic deployment on merge.
- New lessons or product features.
- Migration of existing OpenAI embeddings; production starts fresh.
- WebXR, avatars, new assessment models, LTI, or xAPI.
- Real secret values committed to the repository.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-1 | `wrangler.toml` serves `./dist` using Workers Static Assets and an `ASSETS` binding. |
| FR-2 | Hono handles `/api/*` and `/health`; unmatched routes fall back to static assets without breaking real 404s. |
| FR-3 | Gemini handles chat and embeddings through the configurable adapter. |
| FR-4 | Gemini embeddings return exactly 1536 normalized dimensions using batch requests. |
| FR-5 | Lesson ingestion generates and upserts Gemini embeddings into `lesson_embedding`. |
| FR-6 | Playwright supports `E2E_BASE_URL` without launching a local preview server. |
| FR-7 | Production setup uses a fresh Neon branch with schema, seed, and Gemini embeddings. |
| FR-8 | Deployment docs provide a complete no-secret credential and manual deployment procedure. |
| FR-9 | Production verification proves catalog to 3D lesson to auth/progress to tutor to quiz/mastery to badge/verifier. |
| FR-10 | Roadmap, stale run state, README links, and topic-onboarding wording are corrected. |

## Non-functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No secret, OAuth credential, Neon URL, KV id, account id, or custom domain is committed. |
| NFR-2 | Production catalog and lesson retain Lighthouse performance/accessibility >=95 and best-practices/SEO >=90. |
| NFR-3 | Static lessons and prose remain usable when Gemini, Neon, or auth is unavailable. |
| NFR-4 | Gemini and OpenAI embedding spaces are never mixed. |
| NFR-5 | Deployment is repeatable from documented commands and fails clearly on missing configuration. |
| NFR-6 | Existing tutor quotas, citation validation, auth scoping, and badge verification remain intact. |
| NFR-7 | `pnpm verify:full` and production E2E pass before completion. |
| NFR-8 | Human-only account creation, secret entry, OAuth callback configuration, and deploy approval are explicitly recorded. |

## Acceptance Criteria

| ID | Requirements | Acceptance evidence |
| --- | --- | --- |
| AC-1 | FR-1, FR-2 | Public Worker URL serves the catalog and static assets; `/health` and `/api/*` return API responses on the same origin. |
| AC-2 | FR-2 | Known lesson/verifier routes render; unknown routes produce a real not-found response rather than an HTML fallback loop. |
| AC-3 | FR-3, FR-4 | Unit/integration tests prove Gemini-only embeddings, batch ordering, 1536 dimensions, normalization, and zero OpenAI calls. |
| AC-4 | FR-5, FR-7 | Fresh Neon production branch contains the heart lesson, six hotspots, and valid Gemini embeddings. |
| AC-5 | FR-7 | Google and email/password authentication work against the workers.dev origin with correct callbacks; GitHub OAuth is explicitly deferred by the user. |
| AC-6 | FR-9 | Anonymous and authenticated tutor flows work; quota, disclosure, and static fallback behavior remain intact. |
| AC-7 | FR-9 | A real Gemini answer is grounded in the heart lesson and contains valid clickable citations. |
| AC-8 | FR-9 | Quiz updates mastery, FSRS due cards appear, and OB3 issuance/verification works on the public URL. |
| AC-9 | FR-6, NFR-2, NFR-7 | Production E2E and Lighthouse pass using `E2E_BASE_URL`. |
| AC-10 | FR-8, NFR-1, NFR-5 | Runbook is complete; secret/config audit finds no committed production values. |
| AC-11 | FR-10 | RM-5 is retired, stale release-readiness run files are absent, and README/evidence links resolve. |
| AC-12 | NFR-7 | Final `pnpm verify:full` exits 0 with all configured gates. |

## Edge Cases

- Missing KV id or the `RATE_LIMIT_KV` placeholder blocks deployment with a clear message.
- Missing Gemini key blocks embedding generation and live tutor use; static lesson content still loads.
- Gemini returns an unexpected dimension or malformed batch result; ingestion fails before corrupting the vector table.
- Static asset fallback must not turn unknown `/api/*` routes into successful HTML pages.
- OAuth callbacks must match the final workers.dev origin.
- Production Playwright must not start the local preview server or mutate local data.
- Cloudflare bundle and runtime limits must be checked during deployment.

## Dependencies

- Cloudflare account, Wrangler login, and KV namespace.
- Neon production branch and connection string.
- `BETTER_AUTH_SECRET`.
- Google OAuth application configured for the final workers.dev callback; GitHub OAuth deferred by the user.
- Gemini API key from Google AI Studio.
- GitHub CLI authentication for PR creation.
- Human approval for production deployment.

## Assumptions

- The initial public origin is a workers.dev subdomain; a custom domain is deferred.
- Deployment is manual for the first release.
- Production uses a fresh Neon branch with no existing embedding migration.
- Gemini `gemini-embedding-2` is the production embedding model and emits 1536-dimensional normalized vectors.
- Human-only credential and account steps may pause implementation until supplied.
- Production chat uses an available configurable Gemini Flash model; the initial `gemini-2.5-flash` choice was superseded after the provider reported it unavailable to new users.

## References

- Cloudflare Workers Static Assets and routing documentation.
- Gemini embeddings and `gemini-embedding-2` documentation.
- Existing `docs/DEPLOYMENT.md`, `api/src/env.ts`, `api/src/lib/llm.ts`, and archived track evidence.
