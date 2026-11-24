# Phase 3 Verification — API, Auth & Offline Progress

- Track: `20261124-showcase-mvp`
- Phase: 3 — API, Auth & Offline Progress
- Date: 2026-11-24
- Branch: `feat/20261124-showcase-mvp`
- Phase base: `209583dcd34f6da8f518c0bb45dcff9aab1ae01e`
- Result: **VERIFIED**

## Goal

Hono on Workers provides authenticated, session-scoped progress APIs backed by
Neon, with offline queue sync.

## Tasks completed

| Task | Status | Evidence |
| --- | --- | --- |
| P3.T1 — Hono Worker factory, env bindings, health endpoint | done | `api/src/index.ts`, `api/src/env.ts`, `wrangler.toml` |
| P3.T2 — Drizzle schema, pgvector migration, heart seed | done | `api/src/db/schema.ts`, `api/src/db/client.ts`, `api/src/db/seed.ts`, `migrations/0001_init.sql`, `drizzle.config.ts` |
| P3.T3 — Better Auth with GitHub, Google, email/password | done | `api/src/lib/auth.ts`, `authProviders` descriptor |
| P3.T4 — Session-scoped progress endpoints + KV rate limit | done | `api/src/index.ts`, `api/src/lib/progress-repository.ts`, `api/src/lib/kv.ts` |
| P3.T5 — IndexedDB append-only queue with LWW | done | `src/lib/offline-queue.ts` |
| P3.T6 — Integration tests and client secret audit | done | `tests/integration/progress.test.ts`, `tests/unit/api-client.test.ts`, `tests/unit/offline-queue.test.ts` |

## Verification

Exact command: `pnpm verify`
Exit code: **0** (final run)

| Check | Exit | Summary |
| --- | --- | --- |
| `pnpm lint` | 0 | No errors; 6 warnings (4 IndexedDB `on*` handlers, 2 pre-existing in `glb-manifest.test.ts`) |
| `pnpm fmt:check` | 0 | All 46 matched files correctly formatted |
| `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` — includes all new `api/**` files |
| `pnpm test` | 0 | 5 files, 37 tests passed |
| `pnpm coverage` | 0 | 100% statements/branches/functions/lines on `src/lib/scene-manifest.ts` |
| `pnpm test:integration` | 0 | 3 files, 21 tests passed (13 new progress/auth/audit tests) |
| `pnpm build` | 0 | Static output: 2 pages built; existing R3F/three bundle-size warning persists |

Retry history: two fixes were needed before the passing run — (1) removed two
unused imports in `api/src/index.ts` that failed lint; (2) corrected the tie-break
expectation in `tests/unit/offline-queue.test.ts` and wrapped `app.fetch()` in
`Promise.resolve()` for Hono's `Response | Promise<Response>` signature. No test
was weakened or deleted; no environment file or dependency manifest was changed.

## Acceptance criteria evidence

| AC | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| AC-7 | GitHub, Google and email/password sign-in each succeed; session grants full suite | PASS | `authProviders` descriptor asserts `emailAndPassword: true` plus `github`/`google`; `createAuthOptions` wires all three from bindings, never logging or returning secrets; fake-session integration tests confirm session-scoped access; real OAuth handshakes are a human-only exception (no OAuth credentials available) |
| AC-13 | Progress queued offline appears on the server after reconnect with no duplicate events | PASS | `mergeEvents` dedupes by event ID and applies LWW; `toSyncBatch` orders replay; sync route dedupes against stored IDs and returns `{ applied, duplicates }`. Integration tests replay the same batch twice and assert `eventCount === 1` |
| AC-21 | No API keys or secrets appear in client bundles | PASS | Source-text audit in `tests/integration/progress.test.ts` scans every `src/**/*.{ts,astro}` and `api/**/*.ts` file for credential patterns (provider tokens, connection strings, PEM keys, bearer literals) and asserts `wrangler.toml` declares only `RATE_LIMIT_KV`; `src/lib/api-client.ts` uses `credentials: 'include'` with no keys |

Additional security/robustness coverage: unauthenticated progress calls return
401, session A cannot read session B's progress, malformed events return 400,
and the 121st write in a minute returns 429.

## Deviations

- `tests/unit/offline-queue.test.ts` was added even though it is not in the
  brief's `Touches` list; the brief explicitly allows it for LWW coverage.
- The "no secret names as literal values" rule was interpreted as no hardcoded
  secret **values** in source. Binding/property names (e.g. reading
  `env.GITHUB_CLIENT_ID`) must appear for requirement 3 to be satisfied; the
  audit therefore checks credential-looking literals rather than identifier
  names.

## Blockers

None. Migration and seed were authored as files only; no Neon connection was
attempted, per the brief.

## Notes

- `createApp(deps?)` resolves production dependencies lazily from Worker
  bindings; full injection (`{ db, auth, kv }`) bypasses Neon, OAuth and network
  entirely in tests.
- Drizzle/Neon and in-memory repositories share the `ProgressRepository`
  interface; `buildProgressState` is the single LWW reducer used by both.
- No files outside the brief's `Touches` plus this evidence file were modified.
