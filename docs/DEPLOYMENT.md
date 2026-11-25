# Deployment runbook

Perspectra deploys as one Cloudflare Worker origin: Workers Static Assets serves the Astro `dist/`
build, and the same Worker handles Hono API routes. Neon provides Postgres/pgvector, and Gemini
provides chat and embeddings. Every step needing an account, credential, or approval is marked
**[HUMAN ONLY]**. No secret, account id, KV namespace id, Neon URL, or real domain belongs in this
repository.

## 1. Prerequisites and accounts

- [ ] Node.js 24 and `pnpm` (see `package.json`), plus the GitHub CLI if release automation is used.
- [ ] [HUMAN ONLY] Cloudflare account with Workers and KV access. Log in with
  `pnpm exec wrangler login`; never commit the resulting token.
- [ ] [HUMAN ONLY] Neon project with a fresh production Postgres branch, pgvector available, and a
  connection string held outside git.
- [ ] [HUMAN ONLY] Gemini API key with the intended budget and the application kill switch enabled.
- [ ] [HUMAN ONLY] Google OAuth application for Better Auth. Its callback URL must use the final
  `https://perspectra-api.<subdomain>.workers.dev` origin.
- [ ] GitHub OAuth is explicitly deferred by the user for this release. Its provider code remains
  available, but no GitHub OAuth application, credentials, or callback verification is required.
- [ ] Repository checked out on the release commit; run `pnpm install --frozen-lockfile`.
- [ ] `pnpm verify:full` passes locally before deployment.

## 2. Gemini-only environment and secrets

Supply secrets through Worker bindings at deploy time. Never place values in `wrangler.toml`,
`.env`, `.dev.vars`, `dist/`, git, or evidence. Use
`pnpm exec wrangler secret put <NAME> --config .conductor/deploy/wrangler.toml` after preparing the
private config, or enter the same values in the Cloudflare dashboard.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon branch connection string for Drizzle, seed, and embedding ingest |
| `BETTER_AUTH_SECRET` | yes | Session signing and OB3 HMAC key |
| `BETTER_AUTH_URL` | yes | Exactly the public Worker origin, `https://perspectra-api.<subdomain>.workers.dev` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes | Google OAuth application |
| `LLM_PROVIDER` | no | Omit for the default or set to `gemini`; no other provider is supported |
| `LLM_API_KEY` | yes | Gemini chat key and default embedding key |
| `LLM_MODEL` | no | Optional chat override; defaults to `gemini-3.5-flash` |
| `EMBEDDING_API_KEY` | no | Optional Gemini embedding key; falls back to `LLM_API_KEY` |
| `EMBEDDING_MODEL` | no | Omit or set to `gemini-embedding-2`; other models are rejected |
| `RATE_LIMIT_KV_ID` | deploy only | Private 32-hex KV namespace id used by `pnpm deploy:prepare`; never commit it |

Google OAuth and email/password are required authentication paths for this release; email/password
needs no provider application credentials. GitHub OAuth is explicitly deferred by the user, so its
credentials are not listed as required.

Chat uses `gemini-3.5-flash` by default and sends the API key in the `x-goog-api-key` header rather
than the URL. The adapter uses temperature `1` and minimal thinking while retaining
`maxOutputTokens: 400`. Gemini 3 counts thinking tokens against that cap, so minimal thinking
preserves response capacity for the validated answer.

Embeddings use `gemini-embedding-2:batchEmbedContents` with `outputDimensionality: 1536`. The
adapter validates every row and normalizes vectors to unit L2 norm before writing the existing
`vector(1536)` column. The browser uses same-origin relative API URLs; no split-origin API setting
is needed.

## 3. Private KV deployment config

The committed `wrangler.toml` contains only the obvious 32-zero `RATE_LIMIT_KV` placeholder and the
non-secret `ASSETS` binding configuration.

1. [HUMAN ONLY] Create the namespace in the Cloudflare dashboard or with
   `pnpm exec wrangler kv namespace create RATE_LIMIT_KV`. Keep the returned id outside git.
2. Supply the id only to the preparation command:

   ```bash
   RATE_LIMIT_KV_ID=<private-namespace-id> pnpm deploy:prepare
   ```

   PowerShell equivalent:

   ```powershell
   $env:RATE_LIMIT_KV_ID = '<private-namespace-id>'
   pnpm deploy:prepare
   ```

3. The command validates the id, replaces only the committed placeholder, and writes
   `.conductor/deploy/wrangler.toml`. Because that generated config lives in a subdirectory, the
   command also resolves `main` and `[assets].directory` to absolute normalized project paths;
   the committed template remains root-relative. `.conductor/` is gitignored, and the command never
   prints the id.
4. Keep the real id out of tracked files and command evidence. Wrangler does not substitute
   environment variables inside `wrangler.toml`; deploy with the generated private config instead.

## 4. Neon branch: schema, seed, and embeddings

1. [HUMAN ONLY] Export the chosen branch's `DATABASE_URL` in the shell without persisting it in a
   tracked file.
2. Review and apply the schema with `pnpm db:push`.
3. Seed every discovered MDX lesson with `pnpm db:seed`, including the Heart and Earth titles,
   descriptions, and six hotspot IDs each. The additive seed is safe to rerun and preserves existing
   embeddings and progress rows.
4. Generate and upsert Gemini document embeddings:

   ```bash
   LLM_PROVIDER=gemini EMBEDDING_MODEL=gemini-embedding-2 LLM_API_KEY=<your-key> pnpm exec node --experimental-strip-types scripts/embed-lessons.ts --write
   ```

   `DATABASE_URL` must already be exported. Set `EMBEDDING_API_KEY` instead only when embeddings
   use a separate Gemini key. Without `--write`, the script emits NDJSON and does not write to the
   database.

    At runtime, the Worker creates one Neon WebSocket Pool/Drizzle pair per request and shares it across
    that request's auth, progress, retrieval, quiz, and badge work. Hono middleware closes the pool via
    `waitUntil` after the response without delaying it. This request boundary is required by the Workers
    runtime; `neon-http` is not substituted because Better Auth requires interactive transactions.

## 5. Build and deploy one Worker

1. [HUMAN ONLY] Confirm the Cloudflare login and target account with `pnpm exec wrangler whoami`.
2. Build the static site with `pnpm build` (output: `dist/`). Both the Heart and Earth lessons ship
   their manifest-referenced 960×960 WebP posters; regenerate them with the deterministic recipes in
   `assets/heart/` and `assets/earth-interior/`, keeping each poster below 120,000 bytes as enforced
   by the asset contracts and integration suite. The retained PNGs are reproducible WebP sources,
   not the delivered LCP images.
3. Prepare the private config with section 3's `pnpm deploy:prepare` command.
4. [HUMAN ONLY] Set every secret in section 2 against the generated config.
5. [HUMAN ONLY] Set `BETTER_AUTH_URL` to the workers.dev origin before the final deployment.
6. [HUMAN ONLY] Deploy the Worker and its static assets together:

   ```bash
   pnpm exec wrangler deploy --config .conductor/deploy/wrangler.toml
   ```

There is no separate static-site deployment. Wrangler serves `./dist` through the `ASSETS` binding,
runs the Worker first for `/api/*` and `/health`, and Hono preserves real 404 responses for unknown
routes.

## 6. Post-deploy verification

Run the local release gate before deployment:

- `pnpm verify:full` — lint, format, types, unit, coverage, integration, build, smoke, and Playwright.

Run the tracked full production smoke for each supported lesson against the public origin. It uses
a unique email/password user created through the real Better Auth endpoints, checks grounded tutor
SSE and citations, generates and grades a real quiz, replays additive progress to the 0.85 mastery
threshold, and issues, verifies, and tampers with a real badge. It never deletes data or prints
credentials, cookies, or email addresses.

```bash
E2E_BASE_URL=https://perspectra-api.<subdomain>.workers.dev node scripts/production-smoke.mjs heart
E2E_BASE_URL=https://perspectra-api.<subdomain>.workers.dev node scripts/production-smoke.mjs earth-interior
```

Each run writes a sanitized JSON summary under gitignored `.conductor/evidence/`; set `SMOKE_OUTPUT`
to another file inside that directory when needed. The lesson ID defaults to `heart`, and any failed
check exits nonzero.

Run production E2E and Lighthouse against the same origin without starting a local preview server:

Use the serial one-worker command for reliable production verification. Parallel Playwright
workers can contend with Lighthouse and cause score variance; all thresholds and existing per-test
retries remain unchanged.

```bash
E2E_BASE_URL=https://perspectra-api.<subdomain>.workers.dev pnpm test:production --workers=1
```

PowerShell equivalent:

```powershell
$env:E2E_BASE_URL = 'https://perspectra-api.<subdomain>.workers.dev'
pnpm test:production --workers=1
```

The `@production-earth` E2E test explicitly skips when `E2E_BASE_URL` is absent. With it set, the
test creates a unique real Better Auth session, attaches its cookie to a browser, checks both
catalog lessons and all six Earth landmarks, and exercises real tutor and quiz requests through the
UI. It requires a substantive Earth answer with valid citations and verifies lesson-scoped mastery
updates; it does not mock Gemini or issue a badge unless the smoke runner has independently proved
the threshold. Console/page failures are collected, with only a documented favicon 404 allowed.

Manual browser proof **[HUMAN ONLY]** (use the evidence checklist in `conductor/workflow.md`):

1. `/` loads the zero-JavaScript catalog; `/lessons/heart/` and `/lessons/earth-interior/` each
   render prose plus six landmarks.
2. Hotspot clicks, keyboard focus, and reduced-motion behavior work; the poster remains a usable
   fallback.
3. `/health` returns the Hono health payload on the same origin. A known `/api/*` route responds as
   an API route, while `/api/not-a-route` and `/not-a-route` return real 404s rather than an HTML
   index fallback.
4. Google OAuth and email/password callbacks use the workers.dev origin. GitHub OAuth is explicitly
   deferred by the user and is not part of required production verification. Anonymous and
   authenticated tutor flows retain disclosure, quota, and static-excerpt behavior.
5. A grounded Gemini answer includes a clickable citation. Quiz, mastery, FSRS due cards, badge
   issuance, and `/verify/` work for valid and tampered credentials.
6. Browser console, Worker logs, KV counters, accessibility, and Lighthouse budgets are clean.

## 7. Rollback

1. [HUMAN ONLY] Stop writes if data is wrong: pause the Worker in the Cloudflare dashboard.
2. [HUMAN ONLY] Roll back the single Worker deployment with
   `pnpm exec wrangler deployments list --config .conductor/deploy/wrangler.toml` and
   `pnpm exec wrangler rollback <deployment-id> --config .conductor/deploy/wrangler.toml`, or
   redeploy the last known-good commit after preparing its private config again.
3. [HUMAN ONLY] For schema problems, restore the Neon branch from a verified snapshot or use
   point-in-time recovery. `drizzle-kit push` has no automatic down migration; do not attempt an
   ad-hoc destructive revert. Re-run `pnpm db:seed` and Gemini embedding ingest after a clean
   restore.
4. [HUMAN ONLY] Rotate any exposed secret at the provider and with
   `pnpm exec wrangler secret put <NAME> --config .conductor/deploy/wrangler.toml`. Record the
   incident and follow-ups outside this runbook.
