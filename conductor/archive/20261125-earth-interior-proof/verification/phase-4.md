# Phase 4 Verification — Production Rollout & Real-Service Proof

- **Track:** `20261125-earth-interior-proof`
- **Phase:** 4
- **Date:** 2026-11-25
- **Branch:** `feat/20261125-earth-interior-proof`
- **Phase base:** `2de24b6b09c39fb90c5a2597261c20ff244b7a76`
- **Implementation commit:** `0794b13d4bf3e984d9b70c856ca2c4e18623454e`
- **P4.T5 commit:** `55c0665`
- **Latest verification commit:** `55c0665`
- **Executor result:** `FAILED` (superseded by the primary final verification below)
- **Local acceptance:** `VERIFIED`
- **Production acceptance:** `VERIFIED` (primary real-service proof below)
- **Final production revision:** `c994e3b0-1d1c-40c2-89c3-168be904ea25`

The tracked smoke runner, production-only Earth E2E contract, and rollout documentation are
implemented. P4.T5 tolerates only Windows `EPERM` errors raised while removing Lighthouse's
numeric temporary profile, after Chrome termination has been attempted. The primary final
`pnpm verify:full` exited 0 after the permitted formatter retry; Heart and Earth each passed their
existing single Lighthouse retry. No threshold, retry configuration, or assertion was weakened.

The executor did not deploy, seed or embed production data, call real Gemini/Neon services, read
private deployment configuration, or claim a production result. The primary owns deploy, real smoke,
production E2E, browser, console/fallback, and production Lighthouse verification.

## Latest final-tree verification

Command: `pnpm verify:full`

Exit code: `1`

Commit: `55c0665`

| Layer | Result |
| --- | --- |
| Lint | Zero errors; five pre-existing warnings in `offline-queue.ts` and `worker-assets.test.ts`. |
| Format | All 104 matched files correctly formatted. |
| Typecheck | Passed. |
| Unit | 185 tests passed across 21 files. |
| Coverage | 98.63% statements, 92.89% branches, 97.89% functions, 99.13% lines. |
| Integration | 66 tests passed across 7 files. |
| Build | Four static pages built, including both lesson routes. |
| Smoke | Two Heart/Earth scene smoke tests passed. |
| Playwright | 29 passed, two failed, one flaky test passed its existing retry, and one production-only Earth test explicitly skipped without `E2E_BASE_URL`. |

Final failed output:
`C:\Users\Ansyar\.local\share\opencode\shell\50ce724efc94a9b6112c778c8a7e31212e06687c\sh_21162a210001ZUyUI6GcFO5S4m.out`

The build retains the existing Vite warning about a minified chunk larger than 500 kB. This is not
the failure.

### Final-tree Lighthouse

Thresholds remained accessibility 0.95, best practices 0.9, performance 0.95, and SEO 0.9.

| Path | Accessibility | Best practices | Performance | SEO | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 1.00 | 0.96 | 1.00 | 1.00 | Passed; Windows profile-cleanup `EPERM` warning was tolerated |
| `/lessons/heart/` | 1.00 on retry | 0.96 on retry | 0.87 initial; 0.97 retry | 1.00 on retry | Flaky pass through the existing single retry |
| `/lessons/earth-interior/` | Not emitted on failed budgets | Not emitted on failed budgets | 0.91 initial; 0.79 retry | Not emitted on failed budgets | Failed both attempts; a cleanup warning did not suppress the score failure |

Final failure details:

```text
Lighthouse budgets failed for /lessons/earth-interior/: performance=0.91 (need >= 0.95).
Retry: performance=0.79 (need >= 0.95).

a11y reduced-motion test: 60000 ms timeout while clicking the mitral-valve hotspot.
```

No further broad verification rerun was attempted after this result. The follow-up permits the
existing per-test retry for transient scores and does not permit broader retries or weaker budgets.

### Earlier successful source-commit run

For history, exact `pnpm verify:full` exited 0 on implementation commit `0794b13` before the evidence
commit: lint, formatting, typecheck, 185 unit tests, coverage, 66 integration tests, build, and two
smoke tests passed. Playwright reported 31 passed, one flaky Heart Lighthouse test that passed its
configured retry, and the expected production-only skip. Heart Lighthouse retry performance was
0.99; catalog was 0.98 and Earth was 0.96, with accessibility 1, best practices 0.96, and SEO 1 for
all three.

Output:
`C:\Users\Ansyar\.local\share\opencode\shell\50ce724efc94a9b6112c778c8a7e31212e06687c\sh_2113a1a2d001noPW9oX6aynHM8.out`

That historical success does not override the final-tree failure above.

## P4.T5 — Windows temporary-profile cleanup

The primary reproduced a Windows-only defect after otherwise passing Lighthouse audits:
`chrome.kill()` threw `EPERM` while removing its temporary profile. Normal score variance under load
was a separate issue and was not treated as permission to lower thresholds or remove retries.

`tests/e2e/performance.spec.ts` now applies cleanup-only handling:

- The audit and every category assertion still run first. Audit failures are captured, not discarded.
- `chrome.kill()` is still called for every audit. The installed chrome-launcher attempts process
  termination before it removes the numeric `lighthouse.<digits>` temporary profile.
- Only an error with `process.platform === 'win32'`, `code === 'EPERM'`, and a path inside that
  Lighthouse temporary directory is tolerated. It emits a warning and allows a passing audit to
  complete.
- Every other cleanup error is rethrown. If an audit and a non-tolerated cleanup error occur together,
  an `AggregateError` retains both, with the cleanup error as its cause.
- After tolerated cleanup, any captured Lighthouse/assertion failure is rethrown, so cleanup handling
  cannot convert a failed score into a pass.
- All category thresholds, static-catalog and zero-JavaScript assertions, per-path tests, fresh
  headless-Chrome launches, and the existing one retry remain unchanged. No dependency was added.

The final run exercised the tolerated path: catalog emitted the cleanup warning and passed, and an
Earth attempt emitted the warning but still failed its performance assertion. This directly confirms
that the handling is cleanup-only rather than score suppression.

## Tracked production smoke runner

`scripts/production-smoke.mjs` is dependency-free and import-safe.

- Accepts `heart` or `earth-interior` as the first argument and defaults to `heart`.
- Rejects any other lesson ID.
- Requires `E2E_BASE_URL` to be an absolute HTTP(S) origin with no path, query, fragment, or
  credentials.
- Writes a sanitized JSON summary beneath gitignored `.conductor/evidence/`; `SMOKE_OUTPUT` may
  select another file only within that root. Files are written with mode `0600`.
- Uses `randomUUID()` for the unique email/password account and every synthetic learning-event ID.
- Keeps session cookies only in memory. It does not print or persist email addresses, passwords,
  cookies, request/response bodies, or badge credential contents.
- Prints only per-check pass/fail status and the sanitized evidence path.
- Writes failed-check summaries and exits nonzero; there is no acceptance skip switch.

The runner checks health, both catalog cards, the selected lesson's six landmarks/prose sections,
unique-email sign-up/sign-out/sign-in, initial progress, grounded SSE tutor output with valid
lesson-scoped citations, real quiz generation/grading, additive progress sync, idempotent replay,
lesson-scoped progress/mastery at or above `0.85`, badge issuance/verification, and tamper rejection.
It intentionally inspects SSE `error` events because tutor errors can use HTTP 200.

Exact primary commands:

```sh
E2E_BASE_URL=<public-origin> node scripts/production-smoke.mjs heart
E2E_BASE_URL=<public-origin> node scripts/production-smoke.mjs earth-interior
```

## Production E2E contract

`tests/e2e/earth-loop.spec.ts` is tagged `@production-earth`.

- Without `E2E_BASE_URL`, it explicitly skips with a production-only reason, so local verification
  remains green.
- With an origin, it creates a unique Better Auth email/password user, signs out/in, and transfers
  the in-memory storage state to a fresh browser context. Tracing is disabled at file scope to avoid
  persisting credential-bearing state.
- It checks both public catalog cards, Earth's heading, six landmarks and prose hotspots, tutor
  disclosure, mastery panel, and hydrated quiz panel.
- It sends a real Earth tutor question through the UI and requires substantive visible text plus at
  least one valid `earth-interior:<hotspotId>:<layer>` citation.
- It generates and grades a real Earth quiz, verifies lesson-scoped mastery, and compares the UI
  mastery value with the graded API response.
- It asserts every observed mastery request targets `earth-interior` and that no badge issuance is
  attempted. Full threshold/badge proof belongs to the smoke runner.
- It collects console, page, and same-origin HTTP errors. Only a same-origin `/favicon.ico` 404 is
  allowed. Gemini failures, API failures, and missing citations fail the test without mocks.

Exact primary command:

```sh
E2E_BASE_URL=<public-origin> pnpm test:production
```

## Documentation

`README.md` and `docs/DEPLOYMENT.md` now document additive multi-lesson seed/ingest, both deterministic
asset sets, both tracked smoke lesson IDs, sanitized smoke output, `SMOKE_OUTPUT`, nonzero failure
behavior, and external `pnpm test:production` behavior. No credentials or private deployment values
were added, and no package or lockfile changed.

## Primary final verification (supersedes the failed executor run)

The primary first ran focused Lighthouse with one worker:

```text
catalog performance 1.00; Heart 0.97; Earth 0.99 — 3 passed
```

The primary then ran exact `pnpm verify:full` twice. The first stopped at the known `oxfmt`
exit-5-with-correct-output flake. The permitted immediate rerun exited `0`:

| Layer | Result |
| --- | --- |
| Lint | Zero errors; five pre-existing warnings. |
| Format | All 104 matched files correctly formatted. |
| Typecheck | Passed. |
| Unit | 185 tests passed across 21 files. |
| Coverage | Per-file 80% gates passed. |
| Integration | 66 tests passed across 7 files. |
| Build | Four static pages built. |
| Smoke | Two Heart/Earth scene tests passed. |
| Playwright | 30 passed, two flaky Lighthouse tests passed their existing single retry, one production-only Earth test skipped locally as designed. |

Final Lighthouse retry scores were catalog `1.00/1.00/0.96/1.00`, Heart `0.99/1.00/0.96/1.00`, and Earth `0.99/1.00/0.96/1.00` for performance/accessibility/best-practices/SEO. The Windows cleanup warning did not suppress any score assertion. Result: **local Phase 4 gates PASS**; the final real-service results are recorded in the primary production proof below.

## Acceptance mapping

| ID | Executor evidence | Status |
| --- | --- | --- |
| FR-8 | Tracked runner, production-only E2E contract, docs, and final real-service evidence | Met |
| AC-4 | Both lesson IDs and full real-service checks are encoded without mocks | Met — additive seed/embed and both 16-check smokes passed |
| AC-5 | Earth production tutor/citation/error assertions are implemented | Met — production Earth E2E and smoke passed |
| AC-6 | Earth production quiz/mastery assertions are implemented; smoke owns full badge threshold proof | Met — production E2E, smoke, and badge verification passed |
| AC-8 | Local results and production browser/console/fallback/Lighthouse history are recorded | Met |
| NFR-2 | Cleanup-only Windows `EPERM` handling preserves thresholds; production serial E2E hit all budgets without retries | Met |
| NFR-3 | Existing renderer fallback/reduced-motion E2E suites passed in local and production runs | Met — production browser fallbacks also passed |
| NFR-5 | Smoke uses unique additive users/events and asserts replay deduplication | Met — both production runs passed |
| NFR-6 | Runner emits only sanitized summaries and uses no private deploy configuration | Met — sanitized JSON reviewed |
| NFR-7 | No dependencies, lockfiles, workspaces, or coverage configuration changed | Verified locally |

## Verification history

1. `ddaff7f` added the runner, production-only E2E, and docs. The first full run stopped at the known
   `oxfmt --check` false exit 5 even though all 104 files were reported correctly formatted.
2. The allowed rerun passed every non-browser stage, then Playwright discovery rejected
   `test.use({ trace: 'off' })` inside a `describe` group.
3. `0794b13` moved tracing configuration to file scope without changing test assertions.
4. Subsequent runs encountered the documented formatter false failure; `pnpm fmt` completed
   successfully with no diff. A later full run passed all non-browser stages and 30 Playwright
   tests, but an Earth Lighthouse attempt met numeric budgets before `chrome.kill()` raised the known
   Windows `EPERM` cleanup error; its retry then scored performance 0.90. Heart scored 0.87 then
   0.95. No threshold was lowered.
5. A full run on `0794b13` exited 0. Its 31 Playwright passes included Heart Lighthouse retry 0.99,
   and the production-only test skipped as designed.
6. `e5c8058` committed this evidence. Two required final-tree `pnpm verify:full` runs then exited 1:
   every non-Lighthouse stage and both learning loops passed, but the unchanged Heart performance
   budget failed at 0.81/0.91 and then 0.90/0.89. The second run was the permitted Lighthouse flake
   rerun. During this evidence correction, `pnpm fmt` again returned the known exit 5 without
   changing files. The Markdown passed `git diff --check` after one trailing-whitespace cleanup. No
   further full verification rerun was attempted; the phase remains `FAILED`.
7. The primary rework follow-up established base `2de24b6` after reproducing the Windows cleanup
   defect. P4.T5 added `tests/e2e/performance.spec.ts` to the allowed work without changing budgets,
   retries, catalog assertions, or fresh-Chrome isolation.
8. `6f8c882` added narrow cleanup handling. `aec5309` replaced an unsafe `finally` rethrow with
   explicit audit-failure capture and combined-error preservation. `1f82499` and `55c0665` retained
   the caught cleanup error as the aggregate cause. Intervening full runs stopped only at the known
   `oxfmt --check` exit 5 despite reporting all 104 files correctly formatted; the final rerun passed
   formatting and every non-browser stage.
9. Exact `pnpm verify:full` on `55c0665` exited 1. Catalog passed after emitting the tolerated cleanup
   warning; Heart passed its existing retry at 0.97; Earth failed performance at 0.91 and 0.79; and
   the unrelated reduced-motion a11y test timed out. No score failure was suppressed and no further
   broad rerun was attempted.

## Primary production proof (2026-11-25)

The primary performed the manual production rollout against the already provisioned private
environment. No secret, cookie, email, account id, or Neon URL is reproduced in this evidence.

### Additive database and embedding rollout

Before rollout the production database contained only `heart`. `pnpm db:seed` then reported:
`Seeded earth-interior (6 hotspots)` and `Seeded heart (6 hotspots)`. The correct ingest command was
`pnpm exec tsx scripts/embed-lessons.ts --write` with the private environment loaded; a prior
`node --experimental-strip-types` invocation failed with `ERR_MODULE_NOT_FOUND` and was not reused.

A private read-only verification confirmed both live lessons after ingest:

| Lesson | Hotspots | Embeddings | Dimensions |
| --- | --- | ---: | ---: |
| `heart` | 6 | 18 | 1536 |
| `earth-interior` | 6 | 18 | 1536 |

This was additive: existing Heart rows and progress were preserved.

### Manual deployment

`pnpm deploy:prepare` regenerated the private Wrangler config from the committed template, and the
private path check returned `mainAbsolute:true`, `mainExists:true`, `assetsAbsolute:true`,
`assetsExists:true`. `pnpm exec wrangler deploy --config .conductor/deploy/wrangler.toml` succeeded.
The public origin was `https://perspectra-api.m-ansyarafi.workers.dev`, current version
`c994e3b0-1d1c-40c2-89c3-168be904ea25`. Ten changed static assets, including the Earth poster/GLB
and rebuilt lesson pages, were uploaded. No custom domain or automatic deploy-on-merge was added.

### Real-service smoke

The tracked runner passed both lessons with a unique email per run:

| Lesson | Result | Evidence |
| --- | --- | --- |
| `heart` | 16 checks passed | `.conductor/evidence/production-smoke-heart.json` (gitignored) |
| `earth-interior` | 16 checks passed | `.conductor/evidence/production-smoke-earth-interior.json` (gitignored) |

Both runs covered health, catalog, the selected lesson and six landmarks, sign-up/sign-out/sign-in,
authenticated progress read, grounded SSE tutor with citations, quiz generation and grading,
additive progress sync, idempotent replay, post-sync progress, mastery threshold, badge
issuance/verification, and tamper rejection. Earth's sanitized summary recorded two tutor citations,
a grounded quiz on `outer_core`, and mastery `0.9189189189189189`. No secrets, cookies, or emails
appear in the sanitized output.

### Production Playwright

The first production run with seven workers found a catalog-count assertion bug and Heart Lighthouse
variance under load. The test was corrected to count exactly two live lesson links while the catalog
intentionally shows five cards (two live lessons and three coming-soon placeholders); the docs now
recommend the serial command because Lighthouse shares CPU with concurrent browser tests. No score
threshold or retry count changed.

The authoritative serial run was `pnpm test:production --workers=1`: **33 passed**, including the
production-only Earth learning loop with a unique real session, all scene/fallback suites for both
lessons, a11y, catalog, tutor, and Lighthouse. Final production Lighthouse scores were catalog
`1.00/1.00/0.96/1.00`, Heart `1.00/1.00/0.96/1.00`, and Earth
`1.00/1.00/0.96/1.00` for performance/accessibility/best-practices/SEO.

### Primary browser review

Production browser evidence is recorded in `verification/browser.md`. On Earth, WebGPU reached a
framed, correctly lit six-layer cutaway; hotspot selection and prose binding worked; forced WebGL
and forced poster fallbacks displayed expected status messages; console errors were limited to the
intentional QA hook and R3F alpha logs. Screenshots were captured but not committed.

Result: **production Phase 4 gates PASS**.

## Deviations

None.

## Phase commits

- `ddaff7f` — `test(production): add tracked real-service proof`
- `0794b13` — `test(production): scope tracing at file level`
- `e5c8058` — `docs(conductor): record phase 4 verification`
- `37d6fef` — `docs(conductor): record phase 4 performance failure`
- `6f8c882` — `test(perf): tolerate Windows profile cleanup EPERM`
- `aec5309` — `fix(perf): preserve audit failures during cleanup`
- `1f82499` — `fix(perf): retain combined audit cleanup cause`
- `55c0665` — `fix(perf): preserve cleanup error as cause`
- P4.T5 evidence correction commit — `docs(conductor): record cleanup handling and verification`

No plan, metadata, registry, package, lockfile, coverage configuration, private deployment,
`.opencode/agents/**`, or other Conductor-state file was edited by this phase executor.
