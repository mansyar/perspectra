# Phase 3 verification — Same-Origin Worker & Production E2E Mode

- Track: `20261124-public-deployment`
- Phase: `3`
- Date: 2026-11-24
- Branch: `chore/20261124-public-deployment`
- Base: `ea12fd17e6ee236cee251b78485df5a1a10e8a9b`
- Implementation head: `d3d9bf4a5c8cf06bf1264079c4482c3e9942afc6`
- Result: **passed locally**

## Implemented

- `wrangler.toml` serves `./dist` through the `ASSETS` binding, runs the Worker first for `/api/*` and `/health`, and keeps the committed `RATE_LIMIT_KV` id as the obvious 32-zero placeholder.
- Hono keeps health/API routes ahead of an API-safe catch-all. The fallback serves an injected asset response, returns a real 404 for a missing binding or an asset 404, and never turns `/api`, `/health`, or unknown `/api/*` requests into an HTML/index response.
- `resolvePlaywrightConfig(env)` preserves local preview behavior and selects an external `E2E_BASE_URL` origin without a web server. External values must be absolute HTTP(S) origins with no path, query, fragment, backslash, or credentials.
- `test:production` requires `E2E_BASE_URL`, invokes the installed Playwright CLI without a new dependency, inherits stdio, and propagates its exit code.
- `renderDeploymentConfig(template, env)` validates the committed template and private id through the existing config helper, refuses a missing placeholder or real committed id, replaces only the `RATE_LIMIT_KV` placeholder, and never logs the supplied id. Direct invocation writes gitignored `.conductor/deploy/wrangler.toml`.
- README, deployment, and architecture docs now describe one Worker/static origin, Gemini-only chat and `gemini-embedding-2` embeddings with 1536 normalized dimensions, private KV preparation, a real Neon branch, build/seed/ingest/deploy commands, production E2E, manual browser proof, and one-Worker rollback. Split-origin Pages and `PUBLIC_API_URL` deployment instructions were removed without refactoring unrelated client source.

## Commits

- `06c1c88b30a1a853836da208301a393bc3a735c2` — `feat(cloudflare): serve static assets from the Worker`
- `0819068138725aa0028e95def3e3e4c9a427b2d4` — `feat(deploy): add production tests and private config`
- `d3d9bf4a5c8cf06bf1264079c4482c3e9942afc6` — `docs(deploy): document the same-origin Worker setup`

## Verification

Exact required command:

```text
pnpm verify:full
```

Final run exited `0`:

- Lint passed with six pre-existing warnings: two `no-array-sort` warnings in `glb-manifest.test.ts` and four `prefer-add-event-listener` warnings in `offline-queue.ts`.
- Format check passed across 96 files; TypeScript/Astro typecheck passed.
- Unit tests: **19 files, 172 tests passed**.
- Coverage: **98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines**.
- Integration tests: **7 files, 45 tests passed**, including injected Worker asset fallback, health/API bypass, missing binding/asset 404 handling, and unknown API route behavior.
- Astro production build passed with **3 pages**; the pre-existing large-chunk warning remained non-blocking.
- Smoke: **1 test passed**.
- Playwright: **17 tests passed** using the existing local preview configuration.
- Lighthouse for `/`: accessibility **1**, best practices **0.96**, performance **1**, SEO **1**.
- Lighthouse for `/lessons/heart/`: accessibility **1**, best practices **0.96**, performance **0.98**, SEO **1**.

Additional checks:

- `pnpm test tests/unit/playwright-config.test.ts tests/unit/prepare-deploy.test.ts`: **2 files, 21 tests passed**.
- `git diff --check`: exited `0` with no output.
- Documentation grep found no `PUBLIC_API_URL`, OpenAI, Pages, or `pages.dev` deployment wording.
- The only 32-hex literal in `wrangler.toml` is the 32-zero placeholder. No private KV id, credential, account id, Neon URL, or domain was added to tracked files.

One earlier full-verification attempt passed lint, format, typecheck, unit, coverage, integration, build, smoke, and 16 of 17 Playwright tests, but the existing heart-lesson Lighthouse performance budget measured `0.93` against the required `0.95`. No unrelated performance code was changed. The exact `pnpm verify:full` command was rerun and passed with heart-lesson performance `0.98`. Formatting also encountered the known `oxfmt` exit-5-with-correct-output flake during the phase; `pnpm fmt:check` passed, including the final full-verification run.

## Requirement mapping

| Requirement | Local result |
| --- | --- |
| FR-1 | Met: Workers Static Assets directory/binding and API-first routing are configured. |
| FR-2 | Met: injected tests cover asset serving, health/API bypass, missing binding, asset 404, and API-safe not-found behavior. |
| FR-6 | Met: pure config resolution covers local/external origins, invalid values, and omission of the external web server; the production wrapper requires the URL and propagates Playwright status. |
| FR-8 | Met: deployment docs provide the complete secret-free account, configuration, database, embedding, build, deploy, E2E, proof, and rollback procedure. |
| NFR-1 | Met: tracked-file audit found only the public 32-zero KV placeholder and no production values. |
| NFR-3 | Met: existing static resilience suites passed; no client or static-rendering behavior was changed. |
| NFR-5 | Met: repeatable scripts fail clearly for missing/malformed/zero ids, invalid external origins, and missing `E2E_BASE_URL`. |
| AC-1 | Met locally through same-origin Worker/static configuration and injected routing tests; public workers.dev proof remains Phase 4. |
| AC-2 | Met locally through asset/404 tests and passing static E2E; public unknown-route proof remains Phase 4. |
| AC-9 | Met locally through config tests and the passing local Playwright/Lighthouse suite; production `E2E_BASE_URL` execution remains Phase 4. |

## Deviations

None.

## Human-only exceptions and Phase 4 follow-up

- No Cloudflare account, KV namespace, secret, OAuth app, Neon branch, or deployment was created or modified.
- Real deployment, workers.dev same-origin browser proof, production E2E/Lighthouse execution, credential entry, OAuth callback configuration, and deployment approval remain **Phase 4**.
- Legacy OpenAI wording in `conductor/tech-stack.md` remains outside this phase's authorized touches; runtime and deployment documentation are Gemini-only.
- No dependency, lockfile, schema, migration, coverage configuration, or Conductor state outside this evidence file was changed.

## Primary verification

- Working tree was clean; `git diff --name-only ea12fd17e6ee236cee251b78485df5a1a10e8a9b..HEAD` contained only the Phase 3 Touches files and this evidence file.
- Exact command `pnpm verify:full` exited `0`.
- Lint: six pre-existing warnings, zero errors.
- Format: 96 files clean; typecheck: clean.
- Unit: **19 files / 172 tests passed**.
- Coverage: **98.61% statements / 92.41% branches / 97.84% functions / 99.12% lines**, with every configured per-file gate passing.
- Integration: **7 files / 45 tests passed**.
- Build: **3 static pages**; pre-existing large-chunk warning only.
- Smoke: **1 passed**. Playwright: **17 passed**.
- Lighthouse `/`: **1.00 performance / 1.00 accessibility / 0.96 best practices / 1.00 SEO**.
- Lighthouse `/lessons/heart/`: **0.98 performance / 1.00 accessibility / 0.96 best practices / 1.00 SEO**.
- Result: **VERIFIED locally**; public deployment and production URL tests remain Phase 4.
