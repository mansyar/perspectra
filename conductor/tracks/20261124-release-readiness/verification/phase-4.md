# Phase 4 Verification — Generic Badge Narrative

- Track: `20261124-release-readiness`
- Phase: 4
- Date: 2026-11-24
- Branch: `chore/20261124-release-readiness`
- Base commit: `970a41f52f1dd90c93783e4e9b870f2949a62053`
- Head commit: see final JSON report (last commit of this phase)
- Result: **VERIFIED** — code, unit/integration tests, `pnpm verify:full`, and the primary browser pass are complete.

## Commands and results

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm fmt` | exit 1 (known oxfmt exit-5 flake) | Reported formatting finished on 89 files and applied formatting, then exited 5. No blind reformat loop. |
| `pnpm verify:full` (attempt 1) | exit 1 (known oxfmt exit-5 flake) | `fmt:check` printed `All matched files use the correct format.` on 89 files but exited 5. |
| `pnpm verify:full` (attempt 2, one allowed rerun) | exit 1 (same flake) | Same clean message and exit 5. |
| `pnpm fmt:check` | exit 0 | Standalone check clean on 89 files, confirming formatting was correct. |
| `pnpm verify:full` (attempt 3) | **exit 0** | Full chain green; details below. |
| `git status --short` | exit 0 | Only the intended badge, fixture, and evidence files changed. |
| `git diff --stat` | exit 0 | 5 files changed in the implementation state (lib, route, verify page, two badge test files). |

Successful `pnpm verify:full` (attempt 3) details:

- `pnpm lint`: 6 pre-existing warnings (`src/lib/offline-queue.ts` lines 72/79/80/105,
  `tests/integration/glb-manifest.test.ts` lines 26/161). No warnings in touched files.
- `pnpm fmt:check`: 89 files formatted correctly.
- `pnpm typecheck`: `astro sync && tsc --noEmit` clean.
- `pnpm test`: 16 unit files / 133 tests passed (up from 16/130; +3 tests in
  `tests/unit/badge.test.ts`).
- `pnpm coverage`: 98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines;
  80% per-file gates satisfied. `api/src/lib/badge.ts` is 97.77% statements / 96.96% branches /
  100% functions / 97.72% lines (uncovered line 133 is the existing malformed-credential catch).
- `pnpm test:integration`: 5 files / 37 tests passed; the non-heart integration case now asserts
  generalized narrative content.
- `pnpm build`: 3 static pages built (`/`, `/lessons/heart/`, `/verify/`).
- `pnpm smoke` (`playwright test --grep @smoke`): 1 passed (Chromium).
- `pnpm test:e2e` (`playwright test`): 17 passed, including Lighthouse budgets
  (`/`: perf 1, a11y 1, best-practices 0.96, SEO 1; `/lessons/heart/`: perf 0.96,
  a11y 1, best-practices 0.96, SEO 1).

## Acceptance criterion / FR / NFR evidence

| Criterion | Status | Evidence |
| --- | --- | --- |
| FR-7 (lesson-correct credential prose) | Met | `BadgeIssueInput.hotspots?: readonly string[]` added; `issue()` builds narrative from lesson id, hotspot count and vocabulary with correct singular/plural, and falls back to count-free generic wording when absent/empty. `issueHandler` passes the already-derived `badgeHotspots(resolved, lessonId)` array. |
| NFR-6 (presentation-only change) | Met | Credential structure, HMAC proof, canonicalization, verification path, `name`, `id`, issuer, and fallback semantics unchanged. No new dependency, no changes to mastery/retrieval logic, config, or lockfile. |
| AC-8 (non-heart narrative + verification) | Met | Unit/integration tests assert a `brain`/`cortex, hippocampus` credential contains the lesson id, `2 hotspots`, and the vocabulary; contains neither `heart` nor `six landmarks`; verifies with `verify()`; tampering fails. Heart behavior and singular/absent/empty cases remain covered. 133 unit + 37 integration tests pass. |
| FR-8 / AC-9 (browser evidence) | Met | `verification/browser.md` Phase 4 PASS: primary clicked `Show brain sample narrative` on `http://127.0.0.1:4321/verify/`, observed `Mastered all 2 hotspots (cortex, hippocampus) of the brain lesson ...`, achievement `brain mastery`, issuer `Perspectra`, issued `2026-11-24T00:00:00.000Z`, status `Sample credential (offline fixture, not signature-verified)` with no `data-valid="true"` marker, zero console errors. No `/api/*` request was made, so no 404 disclosure was needed. |

## Deviations

- `src/pages/verify.astro` was minimally wired to expose a public, offline non-heart fixture
  (`Show brain sample narrative`) so the primary can verify the generalized narrative on a static
  preview, as permitted by the brief. The real `/verify/` request path and credential rendering are
  unchanged; the fixture is explicitly labelled as not signature-verified and uses a public sample
  secret string (`public-browser-fixture-secret`), not a deployment secret.
- `pnpm fmt:check` twice hit the documented exit-5-with-clean-output flake inside `pnpm verify:full`;
  a standalone `pnpm fmt:check` passed and the third `pnpm verify:full` passed. No existing tests were
  weakened, skipped, or deleted.

## Human-only exceptions

Browser verification of `/verify/` (AC-9) was completed by the primary and recorded in `verification/browser.md`; real Cloudflare/Neon/OAuth/LLM
credentials and deployments remain out of scope. No real secret, id, or domain was written anywhere.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify:full` | 0 | lint: 6 pre-existing warnings / 0 errors; fmt:check: 89 files clean; typecheck clean; 16 unit files / 133 tests passed; coverage 98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines with 80% per-file gates; 5 integration files / 37 tests passed; `astro build`: 3 static pages; smoke: 1 passed; E2E: 17 passed; Lighthouse catalog `1/1/0.96/1`, lesson `0.98/1/0.96/1`. |
| Browser pass on `pnpm preview` `/verify/` | PASS | Non-heart fixture narrative, issuance metadata, disclosure marker and zero console errors confirmed; see `verification/browser.md`. |

- Primary diff `970a41f52f1dd90c93783e4e9b870f2949a62053..HEAD` contained only the declared badge lib/route/tests, `src/pages/verify.astro` fixture wiring, and the two evidence files.
- Result: VERIFIED. Primary checkpoint to be recorded in `plan.md`.
