# Deployment runbook

This runbook covers the portfolio deployment of Perspectra: a static Astro site plus a Hono Worker
on Cloudflare and a Neon Postgres branch. Every step that needs an account, credential, or approval
is marked **[HUMAN ONLY]**. No secret value, real account id, or real domain belongs in this repo.

## 1. Prerequisites and accounts

- [ ] `pnpm` (see `package.json` engines), Node.js 24, and `gh` CLI installed.
- [ ] [HUMAN ONLY] Cloudflare account with Workers, Pages, and KV access. Log in with
      `pnpm exec wrangler login` (do not commit tokens).
- [ ] [HUMAN ONLY] Neon project with a real Postgres branch, pgvector available, and a
      connection string. Use a non-production branch for the first run.
- [ ] [HUMAN ONLY] GitHub OAuth app and Google OAuth app credentials for Better Auth.
- [ ] [HUMAN ONLY] LLM provider key (Gemini or OpenAI) with a monthly budget and kill switch.
- [ ] Repository checked out on the release commit with `pnpm install --frozen-lockfile` done.
- [ ] `pnpm verify` and `pnpm check:ci` pass locally before any deploy step.

## 2. Environment variables

All secrets are Worker bindings or environment variables injected at deploy time. Never place values
in `wrangler.toml`, `.env`, `.dev.vars`, `dist/`, git, or evidence. Use
`pnpm exec wrangler secret put <NAME>` for Worker secrets, or a gitignored `.dev.vars` for local dev.

| Variable | Required | Purpose | Where it is used |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string | Worker (Drizzle), `db:push`, `db:seed`, embed script |
| `BETTER_AUTH_SECRET` | yes | Session signing and OB3 HMAC key | Worker secret |
| `BETTER_AUTH_URL` | yes | Public auth base URL (your Worker origin) | Worker |
| `GITHUB_CLIENT_ID` | yes | GitHub OAuth app client id | Worker |
| `GITHUB_CLIENT_SECRET` | yes | GitHub OAuth app client secret | Worker secret |
| `GOOGLE_CLIENT_ID` | yes | Google OAuth app client id | Worker |
| `GOOGLE_CLIENT_SECRET` | yes | Google OAuth app client secret | Worker secret |
| `LLM_PROVIDER` | yes | `gemini` (default) or `openai` | Worker |
| `LLM_API_KEY` | yes | Chat model API key | Worker secret |
| `EMBEDDING_MODEL` | optional | Embedding model override (1536 dimensions required) | Worker, embed script |
| `RATE_LIMIT_KV` | yes | Workers KV binding for quotas, rate limits, quiz keys and cost counter | Worker (`wrangler.toml`) |
| `LLM_MODEL` | optional | Chat model override | Worker |
| `EMBEDDING_API_KEY` | optional | Embedding key (OpenAI falls back to `LLM_API_KEY`) | Worker secret, embed script |
| `PUBLIC_API_URL` | optional | Public Worker origin used by static client fetches | Astro build |

The committed `wrangler.toml` declares only the non-secret `RATE_LIMIT_KV` binding and keeps an
obvious placeholder id. Run `pnpm check:config` before deploying to confirm it was not replaced
with a real id.

## 3. Cloudflare KV namespace

1. [HUMAN ONLY] Create a namespace in the Cloudflare dashboard or with
   `pnpm exec wrangler kv namespace create RATE_LIMIT_KV`. Record the returned id outside git.
2. [HUMAN ONLY] Supply that id at deploy time through the binding configuration (for example a
   Wrangler environment override or dashboard binding), or set `RATE_LIMIT_KV_ID` in the shell when
   validating locally. `pnpm check:config` accepts a real 32-hex id from `RATE_LIMIT_KV_ID`
   without rewriting `wrangler.toml` and rejects the committed placeholder.
3. Never commit the namespace id, and keep the placeholder in `wrangler.toml` to make accidental
   commits obvious in review.

## 4. Database: migrate, seed, embed

All three commands require a real Neon branch via `DATABASE_URL`; none of them work against the
static preview alone.

1. Export `DATABASE_URL` for the chosen branch in the shell (do not persist it in a tracked file).
2. Apply the schema with `pnpm db:push` (`drizzle-kit push --config=drizzle.config.ts`). Review the
   proposed changes before accepting; push is not automatically reversible.
3. Seed the canonical lesson with `pnpm db:seed`. It upserts one `heart` row with six hotspots and
   is safe to rerun.
4. Ingest embeddings with
   `LLM_API_KEY=<your-key> pnpm exec node --experimental-strip-types scripts/embed-lessons.ts --write`
   using a real API key from a secret store. Without `--write` the script only prints NDJSON to
   stdout and does not touch the database. Embeddings must have 1536 dimensions to match
   `vector(1536)`.

## 5. Deploy

1. [HUMAN ONLY] Confirm Cloudflare login and the target account/project with
   `pnpm exec wrangler whoami`.
2. Build the static site with `pnpm build` (output: `dist/`).
3. [HUMAN ONLY] Deploy the Worker with `pnpm exec wrangler deploy` using `wrangler.toml`, and set
   every secret listed in section 2 with `pnpm exec wrangler secret put <NAME>` (or the dashboard).
4. [HUMAN ONLY] Publish the static output to Cloudflare Pages with
   `pnpm exec wrangler pages deploy dist --project-name <your-pages-project>`. Point the custom
   domain at that Pages project in the dashboard if a domain is used; no domain is recorded here.
5. [HUMAN ONLY] Set `BETTER_AUTH_URL` (and `PUBLIC_API_URL` if the client needs an explicit Worker
   origin) to the deployed origins, then redeploy the Worker and the static site if those values
   changed at build time.

## 6. Post-deploy checks

Automated, against the deployed origin where applicable:

- `pnpm smoke` — critical scene/hotspot path.
- `pnpm verify:full` — all local checks plus smoke and every Playwright spec.
- `pnpm perf:lighthouse` — budgets: performance ≥ 0.95, accessibility ≥ 0.95,
  best-practices ≥ 0.90, SEO ≥ 0.90, and 0 bytes of JavaScript on the catalog.

Manual pass **[HUMAN ONLY]** (use the browser evidence checklist in `conductor/workflow.md`):

1. Catalog `/` loads with no script tag and shows the live lesson card.
2. `/lessons/heart/` renders prose, poster/model, and six linked landmarks.
3. Clicking a hotspot updates the active prose section; `?rendererErrors=1` exercises WebGPU → WebGL
   and `?rendererErrors=2` exercises the poster fallback.
4. The tutor panel shows the AI disclosure and privacy note before the first question, and a
   grounded answer includes a clickable citation.
5. `/verify/` loads and verifies both a valid and a tampered credential without console errors.
6. Check Worker logs and KV quota counters for unexpected errors or spend.

## 7. Rollback

1. [HUMAN ONLY] Stop writes if data is wrong: pause the Worker/route in the Cloudflare dashboard.
2. [HUMAN ONLY] Roll the Worker back to the previous deployment (`pnpm exec wrangler deployments list`
   and `pnpm exec wrangler rollback <deployment-id>`) or redeploy the last known-good commit.
3. [HUMAN ONLY] Roll the static site back to the previous Pages deployment in the dashboard (or
   redeploy the last known-good commit with `pnpm exec wrangler pages deploy dist`).
4. [HUMAN ONLY] For schema problems, restore the Neon branch from its latest verified snapshot or
   point-in-time recovery. `drizzle-kit push` has no automatic down migration; do not attempt an
   ad-hoc destructive revert. Re-run `pnpm db:seed` after a clean restore.
5. [HUMAN ONLY] Rotate any exposed secret with `pnpm exec wrangler secret put <NAME>` and revoke the
   old value at the provider. Record the incident and follow-ups outside this runbook.
