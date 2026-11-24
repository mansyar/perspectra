# Review: Public deployment

- **Track:** `20261124-public-deployment`
- **Type:** `chore`
- **Branch:** `chore/20261124-public-deployment`
- **Range:** `02ae838f92fbdb0bd11df2dcea84a3cb5ff29bdd..4bfca50867d838fa1a5d783ad2dc443de7d209dd`
- **Date:** `2026-11-25T09:03:47+11:00`
- **Verdict:** `PASS`

## Summary

The same-origin production deployment is implemented and evidenced end to end. Local and production checks pass, including real Neon/Gemini/Cloudflare operation, Google and email/password authentication, tutor citations, progress, quiz/mastery/badge flows, production E2E, Lighthouse, and browser fallback verification. Review round 1 found no Critical or High defect and three non-blocking documentation/evidence issues; all three were fixed in round 1 and re-review returned PASS with no findings.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass | 177 tests |
| coverage | `pnpm coverage` | pass | 98.61% statements / 92.41% branches / 97.84% functions / 99.12% lines; per-file 80% gates met |
| lint | `pnpm lint` | pass | 0 errors; 7 documented pre-existing warnings |
| format | `pnpm fmt:check` | pass after one permitted flake rerun | 98 files clean |
| typecheck | `pnpm typecheck` | pass | clean |
| build | `pnpm build` | pass | 3 static pages |
| local full | `pnpm verify:full` | pass after one permitted formatter-flake rerun | 177 unit, 46 integration, 1 smoke, 17 E2E |
| production | `pnpm test:production` | pass | 17/17 against the public Workers origin |
| real services | `node .conductor/deploy/production-smoke.mjs` | pass | 13/13 private smoke checks |
| browser | production in-app browser | pass | WebGPU, forced WebGL, forced poster, catalog, verifier, zero console errors |
| Lighthouse | production catalog + lesson | pass | catalog `1.00/1.00/0.96/1.00`; lesson `0.98/1.00/0.96/1.00` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P3.T1, P4.T1 | `tests/integration/worker-assets.test.ts`, production `/health`, static fallback | covered |
| FR-2 | P3.T2, P4.T1, P4.T8 | Worker/API tests, request-scope tests, production smoke | covered |
| FR-3 | P2.T1, P2.T4, P4.T7 | Gemini adapter tests, production tutor proof | covered |
| FR-4 | P2.T2, P2.T4 | 1536-dimension normalized embedding tests | covered |
| FR-5 | P2.T3, P2.T5, P4.T2 | ingestion tests; production Neon has 18 chunks at 1536 dims | covered |
| FR-6 | P3.T3, P3.T6, P4.T5, P5.T1 | `E2E_BASE_URL` tests; production E2E 17/17 | covered |
| FR-7 | P4.T2, P4.T3, P4.T6 | migration, auth evidence, Google/email production proof | covered |
| FR-8 | P3.T4, P3.T5, P4.T1, P5.T2 | deployment docs/config tests/audit; stale GitHub requirement in F1 | covered |
| FR-9 | P4.T4, P4.T5, P5.T1, P5.T3 | production smoke, browser, integrated evidence | covered |
| FR-10 | P1.T1, P1.T2, P1.T3 | README, roadmap cleanup, phase-1 evidence | covered |
| NFR-1 | P3.T4, P3.T5, P5.T2 | secret/placeholder audit and config tests | covered |
| NFR-2 | P4.T5, P4.T9, P5.T1 | production Lighthouse budgets | covered |
| NFR-3 | P3.T2, P4.T4 | static/tutor fallback tests and browser fallback proof | covered |
| NFR-4 | P2.T2, P2.T3, P2.T4, P4.T2 | Gemini-only adapter/ingestion; production re-embed | covered |
| NFR-5 | P3.T4, P3.T5, P4.T1, P5.T2 | runbook/private config/audit; stale GitHub requirement in F1 | covered |
| NFR-6 | P4.T4, P4.T8 | quota, citation, auth, badge, request-scope tests | covered |
| NFR-7 | P3.T3, P4.T5, P5.T1 | external Playwright mode and production suite | covered |
| NFR-8 | P3.T4, P4.T1, P4.T3, P5.T2 | human-only runbook and evidence | covered |
| AC-1 | P3.T1, P3.T2, P4.T1 | same-origin routing/fallback tests and production proof | covered |
| AC-2 | P3.T2, P4.T1, P4.T8 | `/health` 200, static HTML, expected API 401, browser proof | covered |
| AC-3 | P2.T1, P2.T2, P2.T4 | Gemini batch/dimension/normalization tests | covered |
| AC-4 | P2.T3, P4.T2 | seeded heart and 18 validated Gemini embeddings | covered |
| AC-5 | P4.T3 | Google OAuth callback/session and email/password smoke; GitHub explicitly deferred | covered |
| AC-6 | P4.T4 | grounded tutor with citations and quotas | covered |
| AC-7 | P4.T4 | authenticated progress read/sync | covered |
| AC-8 | P4.T4 | quiz/mastery/FSRS/badge issue/verify/tamper | covered |
| AC-9 | P3.T3, P4.T5, P5.T1 | production E2E 17/17 and Lighthouse | covered |
| AC-10 | P3.T4, P3.T5, P4.T1, P5.T2 | runbook/config/audit; stale GitHub requirement in F1 | covered |
| AC-11 | P1.T1, P1.T2, P1.T3 | roadmap retirement, stale-run cleanup, README corrections | covered |
| AC-12 | P5.T1 | `pnpm verify:full` exit 0 | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Deployment runbook still requires deferred GitHub OAuth (fixed)**
  - **Status:** Fixed in review-fix round 1; re-review PASS.
  - **File:** `docs/DEPLOYMENT.md:17-34`
  - **What:** Required-credentials and callback guidance still lists GitHub OAuth, while the amended spec and production evidence explicitly defer it.
  - **Why:** An operator would be instructed to provision and validate an unnecessary OAuth application and secrets.
  - **Fix:** Mark GitHub OAuth as deferred and remove it from required credentials, required callbacks, and production verification. Keep Google OAuth and email/password required; align README/architecture wording.
  - **Requirement:** FR-8, NFR-5, AC-10
  - **Test gap:** None.

### Low

- **F2 — `LLM_MODEL` comment names the stale Gemini 2.5 default (fixed)**
  - **Status:** Fixed in review-fix round 1; re-review PASS.
  - **File:** `api/src/env.ts:25`
  - **What:** The comment says `gemini-2.5-flash`, while the adapter defaults to `gemini-3.5-flash` and production overrides to `gemini-3.5-flash-lite`.
  - **Why:** Operators receive stale configuration guidance.
  - **Fix:** Update the comment to describe the current default and production override.
  - **Requirement:** FR-3
  - **Test gap:** None.

- **F3 — NFR-1 acceptance evidence points to routing instead of the secret audit (fixed)**
  - **Status:** Fixed in review-fix round 1; re-review PASS.
  - **File:** `conductor/tracks/20261124-public-deployment/verification/integrated.md:142`
  - **What:** The NFR-1 row cites same-origin routing, but NFR-1 concerns committed secrets/private identifiers.
  - **Why:** This weakens requirement traceability.
  - **Fix:** Cite section 5's secret/placeholder audit and the config tests.
  - **Requirement:** NFR-1
  - **Test gap:** None.

## Overrides

- <none>

## Plan compliance

All five phases and all 27 tasks are marked complete with checkpoints and evidence. The full non-Conductor diff is 30 files, 1443 insertions, and 390 deletions; per-phase boundaries and base ancestry were independently confirmed. P4 includes the production-driven fixes for generated Wrangler paths, default Worker export, Better Auth session fields, current Gemini settings, request-scoped Neon pools, and the WebP poster. P5 is evidence-only. F1-F3 were non-blocking and were fixed in review-fix round 1; re-review returned PASS with no findings.

## Out of scope

Custom domains, automatic deployment on merge, new lessons/product features, legacy OpenAI-vector migration, WebXR, avatars, and new assessment models. Private `.conductor/deploy/**` files, live credentials, cookies, and production identifiers are excluded from repository review and evidence.

## Debt

- F1-F3 were fixed in review-fix round 1; no open review debt remains.
- GitHub OAuth remains explicitly deferred by the user; Google OAuth and email/password are the verified production paths.

## Doc sync

`updated` — post-review synchronization aligned the deployment runbook, environment comment, README/architecture wording, NFR-1 evidence mapping, final checkpoint, and retrieval coverage detail. Re-review returned PASS.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 2 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 3 |
