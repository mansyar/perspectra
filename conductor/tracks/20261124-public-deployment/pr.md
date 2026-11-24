## Summary

Publishes Perspectra at **https://perspectra-api.m-ansyarafi.workers.dev** as one same-origin Cloudflare Workers Static Assets + Hono application. Adds Gemini-native 1536-dimensional embeddings, a fresh production Neon setup, external-origin Playwright mode, and human-assisted manual deployment documentation while keeping all production credentials private.

## Track

- **ID:** `20261124-public-deployment`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261124-public-deployment/spec.md`](conductor/archive/20261124-public-deployment/spec.md)
- **Plan:** [`conductor/archive/20261124-public-deployment/plan.md`](conductor/archive/20261124-public-deployment/plan.md)
- **Review:** [`conductor/archive/20261124-public-deployment/review.md`](conductor/archive/20261124-public-deployment/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Documentation & State Hygiene | Correct onboarding and stale Conductor state | verified | `76dac01` | Retired RM-5 and removed stale release-readiness runs |
| 2: Gemini-Native Embeddings | Use one Gemini adapter for chat and embeddings | verified | `7d57ebc` | `gemini-embedding-2`, 1536 normalized dimensions, no OpenAI space |
| 3: Same-Origin Worker & Production E2E Mode | Serve app and API from one origin | verified | `185c7e9` | Static fallback, private deploy config, `E2E_BASE_URL` |
| 4: Human-Assisted Production Deployment | Deploy and prove the public vertical slice | verified | `6673fae` | Real Cloudflare/Neon/Gemini/Google auth; GitHub explicitly deferred |
| R1: Review Fixes | Align docs, model comment, and evidence mapping | verified | `40b66d8` | Re-review PASS with no findings |

## Requirements

- [x] `FR-1` — Workers Static Assets and `ASSETS` binding serve `dist/`.
- [x] `FR-2` — Hono serves `/api/*` and `/health`; unmatched routes fall back to assets.
- [x] `FR-3` — Configurable Gemini adapter handles chat and embeddings.
- [x] `FR-4` — Gemini embeddings return exactly 1536 normalized dimensions.
- [x] `FR-5` — Lesson ingestion upserts Gemini embeddings into `lesson_embedding`.
- [x] `FR-6` — Playwright supports `E2E_BASE_URL` without a local preview server.
- [x] `FR-7` — Fresh Neon production schema, seed, and embeddings are installed.
- [x] `FR-8` — No-secret credential and manual deployment procedure is documented.
- [x] `FR-9` — Public catalog-to-credential flow is verified.
- [x] `FR-10` — Roadmap, stale runs, README links, and onboarding wording are corrected.
- [x] `NFR-1` — No production secret or identifier is committed.
- [x] `NFR-2` — Production Lighthouse budgets pass.
- [x] `NFR-3` — Static lessons and prose remain usable during backend failures.
- [x] `NFR-4` — Gemini and OpenAI embedding spaces are never mixed.
- [x] `NFR-5` — Deployment is repeatable and fails clearly on missing configuration.
- [x] `NFR-6` — Tutor quotas, citations, auth scoping, and badge verification remain intact.
- [x] `NFR-7` — Local full verification and production E2E pass.
- [x] `NFR-8` — Human-only account, credential, callback, and deploy steps are recorded.
- [x] `AC-1` — Catalog, `/health`, and `/api/*` work on the public origin.
- [x] `AC-2` — Known routes render and unknown routes remain real not-found responses.
- [x] `AC-3` — Gemini-only batch/dimension/normalization tests pass.
- [x] `AC-4` — Production Neon contains the heart lesson, six hotspots, and 18 Gemini embeddings.
- [x] `AC-5` — Google and email/password auth work on production; GitHub is explicitly deferred.
- [x] `AC-6` — Anonymous/authenticated tutor behavior and fallbacks remain intact.
- [x] `AC-7` — A real grounded Gemini answer contains valid clickable citations.
- [x] `AC-8` — Quiz, mastery, FSRS cards, badge issuance, verification, and tamper rejection work.
- [x] `AC-9` — Production E2E and Lighthouse pass through `E2E_BASE_URL`.
- [x] `AC-10` — Runbook and secret/config audit pass.
- [x] `AC-11` — RM-5/stale runs are removed and README/evidence links resolve.
- [x] `AC-12` — Final `pnpm verify:full` exits 0.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass | 177 tests |
| coverage | `pnpm coverage` | pass | 98.61% statements / 92.41% branches / 97.84% functions / 99.12% lines; per-file 80% gates |
| lint | `pnpm lint` | pass | 0 errors; 7 pre-existing warnings |
| format/typecheck/build | `pnpm verify:full` | pass | 46 integration, 1 smoke, 17 local E2E, 3 pages |
| production E2E | `pnpm test:production` | pass | 17/17 |
| production smoke | `node .conductor/deploy/production-smoke.mjs` | pass | 13/13 including tutor, auth, progress, quiz, mastery, badge and tamper rejection |
| browser | production tab `1990715719` | pass | WebGPU, forced WebGL, poster fallback, catalog, verifier, zero console errors |
| Lighthouse | production catalog | pass | `1.00 / 1.00 / 0.96 / 1.00` performance/accessibility/best-practices/SEO |
| Lighthouse | production lesson | pass | `0.98 / 1.00 / 0.96 / 1.00` |

Full evidence: [`conductor/archive/20261124-public-deployment/verification/integrated.md`](conductor/archive/20261124-public-deployment/verification/integrated.md).

## Media

![Public Perspectra deployment demo](.conductor/media/20261124-public-deployment/demo.gif)

Captured from the public workers.dev origin: catalog, WebGPU heart scene, aorta focus, and public credential verifier.

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 3 findings
- **Accepted/deferred:** GitHub OAuth, explicitly deferred by the user

## Deviations and risks

- GitHub OAuth is intentionally deferred; Google OAuth and email/password are verified. GitHub provider code remains intact.
- Production uses configurable `gemini-3.5-flash-lite` because larger Flash models intermittently returned high-demand 503 responses. The adapter default remains `gemini-3.5-flash`.
- Gemini 3 thinking required minimal thinking and the recommended temperature to leave enough output budget for valid citations.
- Neon WebSocket pools are request-scoped and closed with `waitUntil`; they are never reused across Cloudflare requests.
- The heart poster was reduced from 902,567 bytes to 7,228 bytes, raising production lesson performance from 0.79 to 0.98.
- The existing lazy 3D chunk-size warning remains non-blocking.

## Follow-ups

- Add GitHub OAuth when the user chooses to enable it.
- Continue with RM-1 multi-topic proof after deployment.

## Rollback

```bash
# Revert the merge commit
git revert --no-edit -m 1 <merge-commit>
```

Deployment is manual; merging does not deploy automatically. Roll back the Worker through Cloudflare to the previous version if needed. Migration `0002_session_auth_fields.sql` is additive and nullable; no destructive data rollback is required.
