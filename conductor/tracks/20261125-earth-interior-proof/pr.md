# Earth Interior Topic Proof

## Summary

This track proves Perspectra is genuinely topic-agnostic by shipping a second, visually distinct
lesson — **Inside Earth** — through the exact same MDX, 3D scene, tutor, quiz, mastery, badge,
ingestion, and deployment pipeline used by the heart lesson. The Earth cutaway is an original
deterministic procedural Blender asset (935,332-byte GLB, 18,410-byte WebP poster) with six
named hotspot meshes and a detailed semi-realistic layered interior. No Earth-specific runtime
branch was introduced: seed, embeddings, retrieval, quiz, mastery, and badge vocabulary are
content-driven. Local and real production gates pass, including 188 unit tests, 66 integration
tests, 33 serial production E2E tests, two 16-check real-service smokes, and Lighthouse
1.00/1.00/0.96/1.00 on all three public pages.

## Track

- **ID:** `20261125-earth-interior-proof`
- **Type:** `feature`
- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)
- **Review:** [review.md](./review.md)
- **Integrated proof:** [verification/integrated.md](./verification/integrated.md)

## What happened

| Phase | Result | Checkpoint |
| --- | --- | --- |
| 1 — Earth Content & Catalog Contract | verified | `f6524e5` |
| 2 — Detailed 3D Cutaway & Scene Integration | verified | `77ad9a4` |
| 3 — Generic Learning Loop & Additive Ingestion | verified | `634648e` |
| 4 — Production Rollout & Real-Service Proof | verified | `b5cfd43` |
| 5 — Integrated Proof & Documentation | verified | `74afc95` |

## Requirements

- FR-1 MDX lesson with six sourced hotspots and layered prose — covered.
- FR-2 original deterministic semi-realistic cutaway with named meshes and optimized poster — covered.
- FR-3 same generic renderer, fallback chain, and two-way hotspot/prose binding — covered.
- FR-4 topic-neutral catalog — implemented; one Low finding (intro copy) recorded as debt.
- FR-5 additive content-driven Neon seed and Gemini `gemini-embedding-2` ingestion at 1536 dims — covered.
- FR-6 grounded tutor, quiz, mastery/FSRS, and badge for Earth — covered.
- FR-7 zero Earth-specific TypeScript — covered by source audit.
- FR-8 local, production, browser, and documentation evidence — covered.

All NFR-1..NFR-8 and AC-1..AC-10 are covered; see `review.md` for the full table.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm verify:full` | exit 0 — 188 unit, 66 integration, 2 smoke, 30 non-perf E2E, serial `@perf` 3/3 |
| Coverage | 98.63% stmts / 92.89% branches / 97.89% funcs / 99.13% lines; 80% per-file gates |
| Build | 4 static pages |
| `pnpm test:production --workers=1` | 33/33 against public workers.dev origin |
| Production smoke | 16/16 checks for `heart` and 16/16 for `earth-interior` |
| Production Lighthouse | catalog, Heart, Earth all `1.00 / 1.00 / 0.96 / 1.00` (perf/a11y/BP/SEO) |
| Browser | WebGPU, forced WebGL, forced poster, desktop/mobile visual review — PASS |
| Secret audit | no provider keys, real account/KV IDs, Neon URLs, OAuth secrets, cookies, or tracked env files |

Production origin: `https://perspectra-api.m-ansyarafi.workers.dev` (version `c994e3b0`).

## Media

Demo GIF attached to this PR (production catalog → Earth poster → WebGPU cutaway → outer-core
focus). Hosted URL is refreshed from GitHub after creation.

## Review

- **Verdict:** PASS WITH FINDINGS
- **Rounds:** 1
- **Fixed:** 0
- **Deferred:** F1 neutral catalog intro copy, F2 Python recipe line lengths/docstrings, F3 poster FOV wording. All Low, strict mode off, `min_severity=medium`.

## Deviations and risks

- Catalog still has three pre-existing anatomy "coming soon" placeholders; this track adds two live lessons.
- `src/pages/index.astro` intro names both live subjects (F1); lesson links themselves are MDX-derived.
- Lighthouse under parallel local load can vary; verification now serializes `@perf` without changing thresholds or retries.
- Production deployment remains manual; merge does not deploy.
- External Gemini Flash capacity caused transient 503s during earlier iteration; the app falls back to a static excerpt and the final production proof passed.

## Follow-ups

- Neutralize or derive catalog intro copy (F1).
- Apply Python style-guide cleanup to the Earth recipe (F2).
- Correct poster-FOV wording in the asset contract (F3).
- Future roadmap: RM-2 cohorts/social and RM-3 assessment depth.

## Rollback

- No destructive data changes: seed and embed were additive; no lesson or embedding deletion occurred.
- Code rollback: `git revert --no-edit -m 1 <merge-commit>` (or revert the squashed phase commits before merge).
- Deployment rollback: redeploy the previous Worker version from Cloudflare; no DB rollback is required.
