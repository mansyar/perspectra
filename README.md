# Perspectra

**Understand anything from every angle.**

Perspectra is a topic-agnostic learning experience: a zero-JavaScript static catalog leads into a navigable 3D scene, layered prose, a course-grounded AI tutor, a real mastery model, and a verifiable Open Badge. The shipped vertical slice uses the human heart as its demo topic, but the renderer, content schema, progress events, and credential flow do not hard-code anatomy.

## Why it exists

Most LMSs optimize for distribution, not craft. This showcase proves that a small, reviewable codebase can still deliver:

- an Astro static shell with **0 KB of client JavaScript on the catalog** (`AC-1`),
- a WebGPU → WebGL → poster fallback chain where the prose lesson always works (`NFR-6`),
- grounded AI answers with clickable citations and hard quota guardrails,
- deterministic BKT + FSRS mastery and a public OB3 verifier,
- offline-first progress with event-ID deduplication and last-write-wins sync.

Everything runs at portfolio scale for **$0–10/month** using free tiers plus a metered LLM with a kill switch.

## Three-minute demo script

1. **Catalog (0:00–0:20).** Open `/`. One live lesson card, three labeled placeholders, no script tags in the HTML.
2. **Lesson shell (0:20–0:50).** Open the heart lesson. The poster fills in until the 3D scene is ready. Scroll or use the landmark list — prose and active hotspot stay in sync.
3. **Hotspots (0:50–1:20).** Click `Aorta` in the scene. The corresponding prose section highlights and scrolls into view; camera focus moves when the scene is available.
4. **Tutor (1:20–2:00).** Ask “Why does the left ventricle have thicker walls?” The answer streams with a `[[heart:left_ventricle:overview]]` citation. Click the citation to jump back to the source section. The AI disclosure and privacy note are visible before the first question.
5. **Quiz + mastery (2:00–2:35).** Generate a question, answer it, and watch the heatmap cell update. A due review card appears from FSRS.
6. **Credential (2:35–3:00).** Master all six hotspots, issue the badge, then verify it on `/verify`. Paste a tampered credential to see verification fail.

If WebGPU/WebGL is unavailable or the LLM is down, skip steps 3–5 and read the complete prose lesson — the demo still succeeds.

## Architecture

```
Browser
├── /                         Astro static HTML, zero JS
├── /lessons/heart/           Astro prose + React islands
│   ├── SceneIsland           R3F: WebGPU → WebGL → poster
│   ├── ProseHotspotBinder    two-way hotspot ↔ prose binding
│   ├── TutorDock             cited SSE answers, chips, disclosure
│   ├── MasteryPanel          BKT heatmap + FSRS due cards
│   └── QuizPanel             grounded quiz + remediation
└── /verify                   public OB3 credential verifier

Cloudflare Worker — one public origin (api/src/index.ts)
├── Workers Static Assets     Astro dist/ for catalog, lessons, verifier, and GLB/poster files
├── /health                   Hono liveness probe
├── /api/auth/*               Better Auth handler
├── /api/progress, /sync      session-scoped events, KV rate limit
├── /api/tutor                intent → quota → retrieval → prompt → Gemini → validate → SSE
├── /api/quiz/*, /api/mastery grounded generation, grading, BKT/FSRS view
├── /api/badge/*              OB3 issue + public verify (HMAC-SHA-256 proof)
└── non-API fallback          ASSETS binding; missing assets and unknown routes stay real 404s

Data
├── Neon Postgres             Better Auth tables, events, progress, pgvector chunks
├── Workers KV                anonymous quota, rate limits, quiz answer keys, cost counter
└── Repo assets               MDX + deterministic GLB/poster (R2 is deferred)
```

Design constraints worth knowing:

- **Grounded tutor.** The Worker embeds lesson MDX chunks, retrieves with hybrid BM25 + pgvector cosine, builds a four-part layered prompt, and validates every `[[chunk-id]]` citation *before* emitting a single SSE delta. Off-topic questions are rejected before generation. Bad answers become a static MDX excerpt plus a graceful error — never a blank lesson.
- **Mastery.** `bktUpdate` produces a per-hotspot posterior; `computeMastery` replays `answer` and `quiz_result` events deterministically. `ts-fsrs` schedules reviews with 0.9 desired retention. The default prior is 0.2; the badge threshold is 0.85.
- **Credentials.** OB3 credentials carry a `DataIntegrityProof` using `hmac-sha256` over canonical JSON. This is appropriate for a portfolio-scale verifier; it is **not** a decentralized PKI claim.
- **Local-first.** `src/lib/offline-queue.ts` persists events in IndexedDB, merges by event ID with last-write-wins, and syncs through `/api/progress/sync`.
- **Request-scoped database.** Each API request owns one Neon WebSocket Pool/Drizzle pair, shared by its auth, progress, retrieval, quiz, and badge work, then closed through `waitUntil` after the response. Neon HTTP is not used because Better Auth requires interactive transactions.

## Setup

```bash
pnpm install
pnpm dev                 # Astro dev server
pnpm verify              # lint, format, types, unit, coverage, integration, build
pnpm verify:full         # verify + smoke + all Playwright specs
pnpm exec wrangler dev   # optional: local Worker with bindings
```

Optional focused checks:

```bash
pnpm test:a11y           # @axe-core/playwright audit (@a11y)
pnpm perf:lighthouse     # Lighthouse budget checks (@perf)
```

### Environment variables

All secrets are **Worker bindings**. `wrangler.toml` declares only non-secret bindings; client code never reads env values. Set secrets with `pnpm exec wrangler secret put <NAME>` or in your local `.dev.vars` (not committed).

| Variable | Purpose | Used by |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres connection string | Worker (Drizzle) |
| `RATE_LIMIT_KV` | Workers KV binding for quotas/rate limits; private id injected into ignored deploy config | Worker |
| `RATE_LIMIT_KV_ID` | Private KV namespace id consumed by `pnpm deploy:prepare`; never commit it | Deployment only |
| `BETTER_AUTH_SECRET` | Session signing and OB3 HMAC key | Worker |
| `BETTER_AUTH_URL` | Public auth base URL; use the final workers.dev origin | Worker |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional GitHub OAuth app; explicitly deferred by the user | Worker (provider code retained) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app | Worker |
| `LLM_PROVIDER` | `gemini` only; omit for the default | Worker |
| `LLM_API_KEY` | Gemini chat key and default embedding key | Worker |
| `LLM_MODEL` | Optional chat model override; defaults to `gemini-3.5-flash` | Worker |
| `EMBEDDING_API_KEY` | Optional Gemini embedding key; falls back to `LLM_API_KEY` | Worker |
| `EMBEDDING_MODEL` | Optional; only `gemini-embedding-2` (or `models/gemini-embedding-2`) | Worker |

Chat and embeddings both use Gemini. Chat defaults to `gemini-3.5-flash`, authenticates with the `x-goog-api-key` header, and uses temperature `1` with minimal thinking. Gemini 3 counts thinking tokens against `maxOutputTokens`, so minimal thinking preserves more of the retained 400-token cap for the response. Embeddings call `gemini-embedding-2:batchEmbedContents` with `outputDimensionality: 1536`; the adapter validates each vector and normalizes it to unit L2 norm before it reaches the fixed `vector(1536)` column. Queries and documents use Gemini's task-specific prefixes, and the model is pinned so incompatible embedding spaces cannot be configured.

The browser uses same-origin relative API URLs. `pnpm deploy:prepare` requires `RATE_LIMIT_KV_ID` and writes the private KV id to gitignored `.conductor/deploy/wrangler.toml`; the committed template keeps its 32-zero placeholder. Build with `pnpm build`, then deploy the Worker and static assets together with `pnpm exec wrangler deploy --config .conductor/deploy/wrangler.toml`. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for secrets, Neon setup, production E2E, and rollback.

## Content authoring

1. Write or update `src/content/lessons/<topic>.mdx`. Frontmatter carries the generic scene manifest (model, camera, hotspots). Each hotspot must have a `<div id="..." data-hotspot="...">` section with `data-layer="overview|detail|clinical"` paragraphs.
2. Keep every `data-hotspot` ID in sync with the manifest's `hotspots[].id`. `pnpm build` fails on a mismatch (`AC-2`).
3. Export a GLB whose **named meshes match the hotspot IDs exactly**, plus a manifest-referenced WebP poster under 120 KB. The heart recipe deterministically retains the PNG as its WebP source; its contract is `assets/heart/ASSET_CONTRACT.md`.
4. Generate pgvector rows for retrieval with:

   ```bash
   LLM_PROVIDER=gemini EMBEDDING_MODEL=gemini-embedding-2 LLM_API_KEY=<your-key> pnpm exec node --experimental-strip-types scripts/embed-lessons.ts
   ```

   Set `EMBEDDING_API_KEY` instead to override the key used for embeddings. The script prints NDJSON chunks and embeddings to stdout; it never writes to the database or prints keys.

### Adding a topic

Adding a topic requires content, assets, and embedding ingest: add MDX frontmatter + prose, add a GLB with matching named meshes and a poster, and run the embed script. Production retrieval, the scene renderer, progress API, mastery model, and verifier stay topic-agnostic.

## Verification & evidence

- Logic-bearing modules keep 80% line/branch coverage: `src/lib/scene-manifest.ts` in the unit config, plus mastery/retrieval/prompt/quota/badge paths in their suites.
- `pnpm verify:full` runs the complete chain: lint → format → typecheck → unit → coverage → integration → build → smoke → Playwright (scene, tutor, learning-loop, a11y, perf).
- Phase evidence lives under `conductor/archive/20261124-showcase-mvp/verification/`.

## Accessibility, privacy, and trust

- Target: **WCAG 2.2 AA** with keyboard-reachable hotspots, visible focus indicators, reduced-motion behavior, and a light reading surface on a dark shell.
- Reduced motion disables camera tweens, heartbeat/flow particles, and non-essential transitions. Prose, quiz, mastery, tutor, and verifier stay fully usable at 360px and above.
- **AI disclosure:** the tutor panel states that answers are AI-generated and grounded in the lesson text. **Privacy note:** no keys are shipped to the browser; questions are counted by session and stored server-side only when you are signed in (see the in-product notes for current behavior).
- Known limits: the 3D canvas is desktop-first; keyboard users get an equivalent set of hotspot buttons. A screen-reader-optimized description of the 3D geometry is future work.

## Cost estimate

At portfolio scale (a handful of reviewers): Neon free branch, Workers/KV free allowances, and an LLM budget capped by a 16-turn session limit, 60 requests/day, 150k tokens/day, and a **$10/month kill switch**. Expected spend is **$0–10/month**.

## Licensing

- Code: **MIT** (`LICENSE`).
- Shipped generated assets (heart GLB, poster): **CC0** or **OFL**.
- Z-Anatomy and BodyParts3D are **reference-only** and are **not shipped**; their share-alike terms therefore do not apply to this repository.
- Third-party runtime dependencies keep their own licenses (Notices are summarized in `docs/ARCHITECTURE.md`); no API keys or credential-shaped literals appear in source or built output.
