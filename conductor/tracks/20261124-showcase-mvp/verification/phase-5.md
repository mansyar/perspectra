# Phase 5 Verification — Mastery, Quiz & Credentials

- Track: `20261124-showcase-mvp`
- Phase: 5 — Mastery, Quiz & Credentials
- Date: 2026-11-24
- Branch: `feat/20261124-showcase-mvp`
- Phase base: `7bde3eaeec51ffa16649e7469f658d89bb93c197`
- Head (code commits): `c7a7a45edd5206d730e4cbe1c2553d73cb7b44cd`
- Result: **VERIFIED**

## Goal

Quiz, mastery model, and OB3 credential close the learning loop with a public verifier.

## Tasks completed

| Task | Status | Evidence |
| --- | --- | --- |
| P5.T1 — Deterministic BKT + FSRS mastery model | done | `api/src/lib/mastery.ts`, `tests/unit/mastery.test.ts` |
| P5.T2 — Grounded quiz generation, grading, `/api/mastery` | done | `api/src/routes/quiz.ts`, `api/src/index.ts`, `tests/unit/quiz.test.ts` |
| P5.T3 — FSRS scheduling assertions (Again due sooner than Good) | done | `tests/unit/mastery.test.ts` |
| P5.T4 — OB3 badge service, issue/verify routes, public verifier page | done | `api/src/lib/badge.ts`, `api/src/routes/badge.ts`, `src/pages/verify.astro`, `tests/unit/badge.test.ts`, `tests/integration/badge.test.ts` |
| P5.T5 — Mastery heatmap, quiz island, E2E learning loop | done | `src/components/mastery/**`, `src/components/quiz/**`, `src/pages/lessons/[slug].astro`, `tests/e2e/learning-loop.spec.ts` |

## Verification

Exact command: `pnpm verify:full`
Exit code: **0** (final run)

| Check | Exit | Summary |
| --- | --- | --- |
| `pnpm lint` | 0 | No errors; 6 pre-existing warnings (4 IndexedDB `on*` handlers in `src/lib/offline-queue.ts`, 2 `Array#sort` in `tests/integration/glb-manifest.test.ts`) |
| `pnpm fmt:check` | 0 | All 76 matched files correctly formatted |
| `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` passed for Worker, client, pages and tests |
| `pnpm test` | 0 | 12 files, 83 tests passed (21 new mastery/badge/quiz unit tests) |
| `pnpm coverage` | 0 | Unchanged include list (`src/lib/scene-manifest.ts`); 100% statements/branches/functions/lines |
| `pnpm test:integration` | 0 | 5 files, 30 tests passed (3 new badge integration tests) |
| `pnpm build` | 0 | 3 static pages (`/`, `/lessons/heart`, `/verify`); existing large-chunk and three.js CJS warnings persist |
| `pnpm smoke` | 0 | 1 smoke test passed; existing `[data-hotspot]` prose selectors remain unique |
| `pnpm test:e2e` | 0 | 10 browser tests passed, including the new `@learning-loop` catalog → quiz → heatmap → badge → verify flow |

Additional checks: `pnpm fmt` (allowlisted) formatted the new files. One early
`pnpm verify:full` invocation exited 5 inside `fmt:check` despite printing "All
matched files use the correct format"; a direct `pnpm fmt:check` returned 0 and
all subsequent full chains passed. Earlier failures in the same chain were fixed
without weakening tests: a `Map<string, number>` annotation in `mastery.ts`, the
correct canonical hotspot ID in one unit expectation, and removal of `data-hotspot`
from mastery heatmap cells so the existing smoke selector stays unambiguous.

A text audit of `dist/**` found no `BETTER_AUTH_SECRET`, `LLM_API_KEY`,
`EMBEDDING_API_KEY`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET` or test-secret
literals. No dependency, lockfile, coverage-include or generated file was changed.

## Acceptance criteria evidence

| AC | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| AC-11 | Adaptive mastery model updates from answers and schedules review | PASS | `bktUpdate` + `computeMastery` replay `(timestamp, id)`-ordered events with `ts-fsrs`; unit tests assert monotonic BKT, the six-hotspot prior, deterministic replay, and Again due sooner than Good at the same timestamp |
| AC-12 | Grounded quiz with remediation tied to hotspots | PASS | `/api/quiz/generate` prompt is restricted to `HEART_LESSON_MDX` hotspot prose; generated JSON is Zod-validated, answer index stays server-side in KV, `/grade` appends one stable `quiz_result` event and returns explanation + `remediationId`; unit tests cover prompt scoping, malformed JSON, KV miss, wrong user, and single-event grading |
| AC-14 | Mastery-gated OB3 credential with tamper-evident verification | PASS | `/api/badge/issue` returns 403 with failing IDs until all six hotspots reach 0.85; HMAC-SHA-256 `DataIntegrityProof` over canonical JSON with OB3 contexts; unit/integration tests verify valid issuance, malformed input, wrong secret and modified payload |
| AC-15 | Public verifier page renders achievement details without client secrets | PASS | `/verify` reads `?credential=`, POSTs to `/api/badge/verify` with `credentials: 'include'`, and exposes accessible `role="status"` plus achievement/issuer/issuance date; E2E test asserts valid and tampered credentials; `dist/**` contains no secret literals |

NFR-6 evidence: mastery fetch failure, 401 and quiz generation/grading failures
all leave the prose lesson visible and show a `role="status"` message; the E2E
flow asserts `.prose` visibility before and after grading.

## Deviations

- `BadgeService.issue`/`verify` are `async` because the HMAC proof uses Web Crypto
  (`crypto.subtle`), which is async in both Workers and Node. The production
  resolver reads `BETTER_AUTH_SECRET` from the Worker binding only.
- Mastery heatmap cells use `data-mastery-hotspot` rather than the brief's example
  `data-hotspot`, because prose sections already own `data-hotspot`; reusing it
  made the existing `@smoke` selector ambiguous. Cells still expose visible
  mastery percentages, aria labels, and call `focusHotspot(id)`.
- The brief's `GET /mastery` is provided by `masteryRoutes` exported from
  `api/src/routes/quiz.ts` and mounted at `/api/mastery`, avoiding a new file
  outside `Touches`; the same handler is also reachable at `/api/quiz/mastery`.
- `dueCards` uses a 60-second look-ahead so an Immediately-later FSRS "Again"
  card is surfaced while a "Good" card at the same `now` is not.
- The E2E flow issues the badge through a browser `fetch('/api/badge/issue')`
  assertion step; no badge-issuance UI was added because `Touches` only permit
  the mastery/quiz islands and the public verify page.
- Scheduling uses the already-installed `ts-fsrs@6.0.1` package (added to the
  lockfile by the primary before this phase); the unrelated `fsrs` package was
  never imported.

## Human-only exceptions

- No real LLM, Neon/Postgres, Better Auth/OAuth or production HMAC secret was
  used; all tests inject fakes or fixed test-only strings. Production credential
  issuance, real quiz generation and an actual email/social sign-in still need a
  human smoke test once bindings exist.
- Browser assertions use mocked `**/api/*` responses; they verify UI wiring and
  accessibility, not live generation or credential signatures.

## Blockers

None. The `@learning-loop` spec runs inside the exact `pnpm verify:full` chain
(`pnpm test:e2e`), so no shell quoting workaround was needed.

## Commits

- `b1b2645` — feat(mastery): add deterministic BKT and FSRS mastery model
- `83cfe9e` — feat(badge): add OB3 credential service and verification routes
- `422a7c3` — feat(quiz): add grounded generation, grading and mastery API
- `bbc8fe8` — feat(learning-loop): add mastery heatmap, quiz island and verifier page
- `c7a7a45` — test(learning-loop): add catalog to credential E2E coverage
- Evidence file commit: recorded on the branch after this document was written.

## Notes

- `quizRoutes` and `badgeRoutes` accept static dependency objects or an env
  resolver, matching the established `tutorRoutes` pattern; all tests remain
  network-free and use `InMemoryKv`/`InMemoryProgressRepository`.
- No files outside the brief's `Touches` plus the two allowed wiring files and
  this evidence file were modified.

## Primary verification

The primary ran the exact milestone command `pnpm verify:full` independently from a
clean tree against `7bde3eaeec51ffa16649e7469f658d89bb93c197..HEAD`; exit code 0.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm lint` | 0 | 6 pre-existing warnings, 0 errors |
| `pnpm fmt:check` | 0 | 76 files formatted correctly |
| `pnpm typecheck` | 0 | clean |
| `pnpm test` | 0 | 83 unit tests passed (12 files) |
| `pnpm coverage` | 0 | 100% on the unchanged gate module |
| `pnpm test:integration` | 0 | 30 tests passed (5 files) |
| `pnpm build` | 0 | 3 static pages: `/`, `/lessons/heart/`, `/verify/` |
| `pnpm smoke` | 0 | 1 `@smoke` scene test passed |
| `pnpm test:e2e` | 0 | 10 tests passed, including `@learning-loop` |

The diff contained only the brief's allowed files, and the tree was clean before
the run. The acceptance Criteria table above was cross-checked against the
passing test names.
