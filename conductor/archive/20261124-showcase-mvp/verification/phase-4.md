# Phase 4 Verification — Course-Grounded Tutor

- Track: `20261124-showcase-mvp`
- Phase: 4 — Grounded Tutor
- Date: 2026-11-24
- Branch: `feat/20261124-showcase-mvp`
- Phase base: `d470eb40be1b91883deb321c6d5470566cbb20ab`
- Head (code commits): `0e19016d735c9f9ae2fb1eca7413027e96185c39`
- Result: **VERIFIED**

## Goal

Course-grounded tutor streams cited answers, enforces anonymous/authenticated
quotas, and never blocks the prose lesson. Right dock with chips and free text,
active-hotspot context, clickable citations and AI disclosure.

## Tasks completed

| Task | Status | Evidence |
| --- | --- | --- |
| P4.T1 — Chunk MDX, embed via pgvector-compatible endpoint, hybrid BM25+vector retrieval | done | `api/src/lib/retrieval.ts`, `scripts/embed-lessons.ts`, `tests/unit/retrieval.test.ts` |
| P4.T2 — Layered prompt, cheap intent router, cosine threshold | done | `api/src/lib/prompt.ts`, `api/src/lib/intent.ts`, `tests/unit/{prompt,intent}.test.ts` |
| P4.T3 — Env-configurable LLM adapter with validate-before-stream | done | `api/src/lib/llm.ts`, `api/src/env.ts`, `tests/unit/prompt.test.ts` |
| P4.T4 — KV anon/user/token/turn quotas, kill switch, citation validation | done | `api/src/lib/quota.ts`, `api/src/routes/tutor.ts`, `api/src/index.ts`, `tests/integration/tutor.test.ts`, `tests/unit/quota.test.ts` |
| P4.T5 — Right-dock tutor UI with chips, citations, disclosure | done | `src/components/tutor/{TutorDock.tsx,tutor.css}`, `src/lib/tutor-client.ts`, `src/pages/lessons/[slug].astro`, `tests/e2e/tutor.spec.ts` |
| P4.T6 — Unit, integration and E2E tests | done | 4 new unit files, `tests/integration/tutor.test.ts`, `tests/e2e/tutor.spec.ts` |

## Verification

Exact command: `pnpm verify`
Exit code: **0** (final run)

| Check | Exit | Summary |
| --- | --- | --- |
| `pnpm lint` | 0 | No errors; 6 pre-existing warnings (4 IndexedDB `on*` handlers, 2 `glb-manifest.test.ts` sorts) |
| `pnpm fmt:check` | 0 | All 62 matched files correctly formatted |
| `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` passed for all Worker, client and test files |
| `pnpm test` | 0 | 9 files, 62 tests passed (25 new tutor unit tests) |
| `pnpm coverage` | 0 | Unchanged include list (`src/lib/scene-manifest.ts`); 100% statements/branches/functions/lines |
| `pnpm test:integration` | 0 | 4 files, 27 tests passed (6 new tutor route tests) |
| `pnpm build` | 0 | Static output: 2 pages; existing large-chunk and three.js CJS warnings persist |

Additional checks: `pnpm fmt` (allowlisted) was used to format new files; one
invocation returned exit 5 with no diagnostics, so `pnpm fmt:check` was run
directly (exit 0) and the final `pnpm verify` includes a passing `fmt:check`.
A text audit of `dist/**` found no `BETTER_AUTH_SECRET`, `LLM_API_KEY`,
`EMBEDDING_API_KEY` or provider client-secret literals, and the built lesson HTML
contains the disclosure, privacy note and all six hotspot chips in SSR output.

Retry history: two typecheck errors were fixed — (1) `process.env` was converted
to an explicit `Env`-shaped object in `scripts/embed-lessons.ts`; (2) Hono's
`Response | Promise<Response>` return type was normalised with `Promise.resolve`
in `tests/integration/tutor.test.ts`. No test was weakened, skipped or deleted;
no dependency, lockfile, coverage-include or generated file was changed.

## Acceptance criteria evidence

| AC | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| AC-6 | Anonymous learners get 2 questions, then a sign-in prompt | PASS | Unit test asserts 2 allowed / 3rd `anon_limit` with "Sign in"; integration test replays three requests with one session ID and asserts the sign-in message |
| AC-8 | At least one valid citation; click scrolls prose and moves camera | PASS | `validateCitations` requires ≥1 known chunk ID; `TutorDock` renders `data-citation` buttons calling `focusHotspot`, which sets zustand active state (also read by `SceneIsland`) and scrolls `[data-hotspot]`; E2E test asserts both (see human-only exceptions) |
| AC-9 | Off-topic rejected before generation; invalid citation rejected before streaming | PASS | Intent router runs before quota/retrieval; integration test asserts zero LLM calls for off-topic. `complete()` resolves the full answer before `validateCitations`; invalid answer produces one `invalid_citation` error event and no `delta` events |
| AC-10 | 17th turn and per-day quotas degrade gracefully | PASS | `checkQuota` tests for `turn_limit`, `user_limit` (60), `token_limit` (150k) and `kill_switch` ($10/month); integration test asserts `turn_limit` on turn 17; all denials return SSE error plus static prose excerpt with HTTP 200 |
| AC-17 | `pnpm coverage` gate ≥80% on logic-bearing modules | PASS | Gate unchanged and passing at 100% on its configured module; retrieval/prompt/quota/intent logic is covered by 25 new unit tests and 6 route integration tests without broadening the coverage include list (per brief constraint) |
| AC-20 | AI disclosure and privacy note before first tutor use | PASS | Static SSR output includes `data-testid="tutor-disclosure"` and `data-testid="tutor-privacy"` before hydration; E2E test asserts visible before any prompt |
| AC-21 | No keys or secrets in client bundles | PASS | `dist/**` audit found no credential literals; client uses `credentials: 'include'` and `PUBLIC_API_URL` only |

NFR-6 evidence: every route failure path (invalid body, off-topic, quota denial,
missing adapter, embedding failure, empty retrieval, citation failure, adapter
throw) returns an SSE `error` event with a static excerpt, never an unhandled
exception or a blank page.

## Deviations

- `LessonChunk` was extended with an optional `embedding?: readonly number[]`
  field so `retrieveChunks` can score DB/precomputed vectors; text-only chunks
  keep the lexical-only fallback. This is additive and required for T1's
  hybrid-retrieval contract.
- The dock uses `client:load` instead of the brief's example `client:visible`
  so chip and citation interactions are deterministic on a statically built
  page; it is still mounted exactly once and does not gate the prose.
- Chunks for the Worker are a committed mirror of the six-heart-hotspot prose
  (`HEART_LESSON_MDX`) because Workers cannot import MDX; the script emits
  NDJSON for a future DB seeding step and writes no data file.
- Chat is provider-configurable while embeddings are always OpenAI-compatible
  with fixed 1536 dimensions to match the existing pgvector column.

## Human-only exceptions

- No real LLM, embedding, OAuth or Neon endpoint was contacted; all tests use
  injected fakes. Provider keys and live streaming must be smoke-tested by a
  human once bindings exist.
- The tutor E2E spec was executed by the primary with the correct PowerShell
  quoting (`pnpm exec playwright test --grep '@tutor'`) and all 3 tests passed;
  see Primary verification below. Real LLM/DB/OAuth endpoints remain untested.

## Blockers

- Command `pnpm test:e2e --grep @tutor` — permission denied by the shell
  allowlist. Needed to exercise the new browser-level tutor spec; expected a
  Playwright run against `pnpm preview`. This command is not part of `pnpm
  verify`, which passed with exit code 0.

## Commits

- `2c8bcac` — feat(tutor): add course retrieval, embedding script and intent router
- `c9c00d5` — feat(tutor): add layered prompt, citation validation and LLM adapter
- `8314541` — feat(tutor): add quota gates and validate-before-stream SSE route
- `0e19016` — feat(tutor): add right-dock tutor UI with cited answers
- Evidence file commit: recorded on the branch after this document was written.

## Notes

- `tutorRoutes` accepts either a static dependency object or an env resolver;
  `api/src/index.ts` mounts it at `/api/tutor` using the existing lazy
  `resolve(env)` production path, so all tests remain network-free.
- Every error returns HTTP 200 with `Cache-Control: no-store`; the client parses
  one JSON object per SSE `data:` line.
- No files outside the brief's `Touches` plus this evidence file were modified.

## Primary verification

Primary ran the exact chain independently after the subagent reported:

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm verify` | 0 | lint (6 warnings, 0 errors), fmt:check 62 files, typecheck, 62 unit tests, coverage 100% on configured module, 27 integration tests, build 2 static pages |
| `pnpm exec playwright test --grep '@tutor'` | 0 | 3 browser tests passed (disclosure/privacy, chip request body, citation scroll + active hotspot) |

The diff from `d470eb4..HEAD` was audited and contained only the brief's allowed
files plus the evidence file. The initial `pnpm test:e2e --grep @tutor` attempt
failed only because PowerShell consumed the unquoted `@tutor` as a splat; the
quoted command above passed with no code changes.
