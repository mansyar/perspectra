# Integrated verification and production proof

- Track: `20261124-public-deployment`
- Date: 2026-11-25
- Base: `99630bd70a075e30199efffdbdd99cda825644f9`
- Public origin: <https://perspectra-api.m-ansyarafi.workers.dev>
- Integrated result: **PASS**
- Final checkpoint: `627b01f4558a9de2eb99ce7cde5dc1db4d80b217`

This file consolidates the final local gates, authoritative primary-owned production checks, the read-only secret/placeholder audit, and the fallback behavior relied on by the public release. It does not replace the primary's final checkpoint, review, or PR steps.

## 1. Final local verification

Exact command: `pnpm verify:full`

Exit code: **0**

`verify:full` completed the `pnpm verify && pnpm smoke && pnpm test:e2e` chain. Each subcommand exited 0; no retry was needed.

| Gate | Command | Exit | Result |
| --- | --- | ---: | --- |
| Lint | `pnpm lint` | 0 | Passed with seven non-blocking existing warnings |
| Format | `pnpm fmt:check` | 0 | All 98 matched files correctly formatted |
| Typecheck | `pnpm typecheck` | 0 | Astro content sync and strict TypeScript passed |
| Unit | `pnpm test` | 0 | 21 files, 177 tests passed |
| Coverage | `pnpm coverage` | 0 | 177 tests; thresholds and per-file logic-module gate passed |
| Integration | `pnpm test:integration` | 0 | 7 files, 46 tests passed |
| Build | `pnpm build` | 0 | Astro built 3 static pages; existing large-chunk warning only |
| Smoke | `pnpm smoke` | 0 | 1 Chromium smoke test passed |
| Local E2E | `pnpm test:e2e` | 0 | 17 Playwright tests passed |
| Local Lighthouse | Included in `pnpm test:e2e` | 0 | Catalog and lesson budgets passed |

Local Lighthouse scores are ordered performance / accessibility / best-practices / SEO:

| Route | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1.00 | 1.00 | 0.96 | 1.00 |
| `/lessons/heart/` | 0.96 | 1.00 | 0.96 | 1.00 |

## 2. Authoritative production verification

The primary ran the production commands after loading the private deployment environment. The values below come from the authoritative production command output recorded in the Phase 5 brief and the prior production browser evidence. This audit did not read `.conductor/deploy/production.env` or rerun a production command.

| Check | Command/evidence | Exit | Result |
| --- | --- | ---: | --- |
| Production E2E | `pnpm test:production` with `E2E_BASE_URL` set to the public origin | 0 | 17/17 passed |
| Production Lighthouse: catalog | Production Playwright/Lighthouse run | 0 | Performance 1.00, accessibility 1.00, best practices 0.96, SEO 1.00 |
| Production Lighthouse: lesson | Production Playwright/Lighthouse run | 0 | Performance 0.98, accessibility 1.00, best practices 0.96, SEO 1.00 |
| Real-service smoke | `node .conductor/deploy/production-smoke.mjs` | 0 | 13/13 checks passed |
| Google OAuth | Production browser callback and authenticated get-session evidence | — | HTTP 200 authenticated session |
| Email/password auth | Production real-service smoke | 0 | Passed |

The 13 production smoke checks passed: health, catalog, lesson, tutor with two citations, email authentication, progress read, quiz generation, quiz grading, one-item progress sync, mastery threshold `1.000`, badge issuance, badge verification, and badge tamper rejection.

Public URL: <https://perspectra-api.m-ansyarafi.workers.dev>

Production deployment remains manual. The deployed Worker and static assets share this origin; no Pages deployment or custom domain is claimed.

## 3. Phase roll-up

| Phase | Checkpoint | State | Evidence |
| --- | --- | --- | --- |
| P1 — roadmap and release state | `76dac01` | Verified | [phase-1.md](phase-1.md) |
| P2 — Gemini-native embeddings | `7d57ebc` | Verified | [phase-2.md](phase-2.md) |
| P3 — same-origin Worker and production E2E mode | `185c7e9` | Verified | [phase-3.md](phase-3.md) |
| P4 — production preparation and follow-up fixes | `6673fae` | Verified locally and in production | [phase-4.md](phase-4.md) |
| P5 — integrated verification and proof | `627b01f` | Verified | This file |

## 4. Coverage totals and per-file gate

Coverage totals from the final local run:

| Metric | Covered/total | Percentage |
| --- | ---: | ---: |
| Statements | 357/362 | 98.61% |
| Branches | 195/211 | 92.41% |
| Functions | 91/93 | 97.84% |
| Lines | 339/342 | 99.12% |

Per-file results for logic-bearing modules:

| Module | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `api/src/lib/badge.ts` | 97.77% | 96.96% | 100% | 97.72% |
| `api/src/lib/events.ts` | 100% | 87.50% | 100% | 100% |
| `api/src/lib/mastery.ts` | 95.83% | 80.85% | 100% | 95.65% |
| `api/src/lib/quota.ts` | 100% | 93.75% | 100% | 100% |
| `api/src/lib/retrieval.ts` | 100% | 96.67% | 100% | 100% |
| `src/lib/hotspot-store.ts` | 100% | 93.33% | 100% | 100% |
| `src/lib/offline-queue.ts` | 96.87% | 90.00% | 89.47% | 100% |

**Gate: PASS.** Every reported logic-bearing module remains above the 80% branch and line thresholds. Module subtotals were 98.78% statements / 91.81% branches / 100% functions / 98.73% lines for `api/src/lib`, and 98.27% / 95.00% / 94.44% / 100% for `src/lib`.

## 5. Secret and placeholder audit

Read-only text/config searches covered provider API-key formats, private-key markers, 32-hex identifiers, PostgreSQL/Neon connection URLs, OAuth/API/auth secret assignments, bearer/JWT/AWS/Google-client-id formats, password literals, and cookie values. Git tracked-file queries covered environment files, private-key files, and `.conductor/deploy`.

| Category | Audit result |
| --- | --- |
| Provider API-key-shaped literals | No real provider key found; only deliberately fake test fixtures |
| Private keys | No PEM/private-key markers found |
| Cloudflare account/KV identifiers | No real identifier found; only the documented 32-zero placeholder and a synthetic test fixture |
| Neon/PostgreSQL URLs | No production URL found; only `.invalid` test fixtures |
| OAuth/API/auth secrets | No real secret literal found |
| Cookies | No cookie value literal found; lockfile package names are not cookie data |
| Tracked environment/private-key files | None found |
| `.conductor/deploy` tracked contents | None found |
| Committed KV placeholder | `wrangler.toml` retains only the documented 32-zero `RATE_LIMIT_KV` placeholder |

The placeholder remains guarded. `scripts/check-config.mjs` rejects missing, malformed, and all-zero ids without echoing a supplied id. `scripts/prepare-deploy.mjs` requires the committed placeholder, refuses a real committed id, writes only the ignored generated config, and does not print the private id. Unit tests in `tests/unit/config-check.test.ts` and `tests/unit/prepare-deploy.test.ts` cover these behaviors, including the no-echo assertion.

No secret value is reproduced in this evidence file.

## 6. Known exceptions

- **GitHub OAuth is explicitly deferred by the user.** Google OAuth and email/password authentication are verified and remain in scope.
- **Manual deployment only.** No custom domain is configured or claimed; the workers.dev origin is the public release URL.
- **Real LLM availability is external.** A transient provider 503 can occur. The tutor converts provider failure to the static excerpt fallback rather than failing the lesson experience.
- **Existing >500 kB lazy scene chunk warning.** Non-blocking; the catalog remains zero-JS and the scene chunk is lazy-loaded.
- **Seven pre-existing lint warnings.** Four `prefer-add-event-listener`, two `no-array-sort`, and one test-only `no-shadow`; all non-blocking and outside this evidence-only phase.

## 7. Fallback ladder

| Surface | Ordered fallback |
| --- | --- |
| 3D scene | WebGPU → WebGL → checked-in poster/prose |
| Tutor provider failure | Static grounded excerpt; user-facing tutor error remains recoverable |
| Offline learning | Append-only offline queue → idempotent sync when connectivity returns |
| Reduced motion | Prose-first presentation with usable hotspot binding and no required motion |

Production and local browser tests exercise poster fallback, WebGL recovery, keyboard navigation, reduced motion, and offline/progression contracts.

## 8. Acceptance roll-up

| Requirement | Result | Evidence |
| --- | --- | --- |
| FR-9 | PASS | Public production URL, real-service smoke, OAuth/email auth, and browser evidence |
| FR-10 | PASS | Final README/deployment/runtime state and integrated evidence |
| AC-9 | PASS | Production E2E 17/17 and Lighthouse budgets |
| AC-10 | PASS | Deployment documentation, manual proof, rollback guidance, and this audit |
| AC-12 | PASS | Exact `pnpm verify:full` chain exited 0 |
| NFR-1 | PASS | Section 5 secret/placeholder audit; `tests/unit/config-check.test.ts`; `tests/unit/prepare-deploy.test.ts` |
| NFR-2 | PASS | Catalog/lesson Lighthouse scores meet budgets |
| NFR-7 | PASS | Playwright production suite passed |
| NFR-8 | PASS | Human-only exceptions and final checkpoint are explicit |

## 9. Final result

**PASS** — local gates, production E2E, production Lighthouse, real-service smoke, authentication proof, coverage gates, secret audit, and fallback evidence are complete.

`627b01f4558a9de2eb99ce7cde5dc1db4d80b217`

## 10. Primary verification

The primary independently repeated `pnpm verify:full`. The first attempt hit the documented oxfmt exit-5-after-clean-output flake; the immediate permitted rerun exited 0 with 177 unit tests, 46 integration tests, 1 smoke test, 17 local E2E tests, the per-file coverage gate, and a 3-page build. Final local Lighthouse was catalog `1.00/1.00/0.96/1.00` and lesson `0.96/1.00/0.96/1.00`.

The primary also independently reran `pnpm test:production` (17/17) and the real-service production smoke (13/13) after Google OAuth credentials were installed. Production Lighthouse was catalog `1.00/1.00/0.96/1.00` and lesson `0.98/1.00/0.96/1.00`. Result: **PASS**.
