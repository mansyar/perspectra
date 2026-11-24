## Summary

Perspectra's Showcase MVP delivers a 3D-first, topic-agnostic learning platform: MDX lessons drive an interactive WebGPU/WebGL heart scene with two-way hotspot↔prose binding, a course-grounded streaming tutor with clickable citations, BKT + FSRS mastery, a quiz loop, and a verifiable Open Badges 3.0-shaped credential. The public shell ships zero client JS and the catalog/lesson meet the Lighthouse performance and accessibility gates.

## Track

- **ID:** `20261124-showcase-mvp`
- **Type:** `mvp`
- **Spec:** [`conductor/archive/20261124-showcase-mvp/spec.md`](conductor/archive/20261124-showcase-mvp/spec.md)
- **Plan:** [`conductor/archive/20261124-showcase-mvp/plan.md`](conductor/archive/20261124-showcase-mvp/plan.md)
- **Review:** [`conductor/archive/20261124-showcase-mvp/review.md`](conductor/archive/20261124-showcase-mvp/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Foundation & Content Contracts | Establish Astro 7, MDX lesson schema and build-time hotspot validation | verified | `ecff8e7` | Zod scene manifest; any unmatched `data-hotspot` aborts the build |
| 2: 3D Scene & Hotspot Binding | Render the heart as an R3F island with a graceful fallback chain and two-way binding | verified | `9df6c5b` | Poster → WebGL → WebGPU step-down with retry; deterministic prose selection |
| 3: API, Auth & Offline Progress | Hono on Workers with authenticated, session-scoped progress and offline sync | verified | `f43554b` | Neon/Drizzle port, Better Auth, Workers KV quota seam, LWW event replay |
| 4: Grounded Tutor | Stream course-grounded answers with citations, quotas and anti-misuse gates | verified | `b43a62a` | Hybrid retrieval, cosine threshold, off-topic router, citation validation before stream |
| 5: Mastery, Quiz & Credentials | Close the learning loop with BKT + FSRS, quiz remediation and a public verifier | verified | `df16b86` | HMAC-SHA-256 `DataIntegrityProof` badge; tamper rejection tested |
| 6: Polish & Proof | Meet performance, accessibility, licensing and documentation bar | verified | `0bd954e` | Lighthouse and axe evidence; dark shell + light reading surface |
| R1: Review Fixes | Resolve initial review findings and browser-found visual defects | verified | `f100566` | Renderer remount, DB chunk source, real coverage gate, framing and lighting |
| R2: Re-review Fixes | Remove the production second-lesson topic lock | verified | `1d84826` | Unfiltered DB chunks, source-derived intent/mastery/badge vocabulary |

## Requirements

- [x] `FR-1`–`FR-4` — Astro static shell, MDX content contracts, R3F scene with fallback, two-way hotspot↔prose binding
- [x] `FR-5`–`FR-8` — anonymous 2-question quota, authenticated tutor, hybrid retrieval with citations, anti-misuse gates
- [x] `FR-9`–`FR-12` — quiz generation and grading, BKT + FSRS mastery with next-best/review cards, offline progress, OB3 badge + verifier
- [x] `FR-13`–`FR-14` — deterministic Blender asset recipe with committed GLB/poster; AI disclosure, privacy note and accessibility
- [x] `NFR-1`–`NFR-9` — performance, asset budget, security, availability, WCAG 2.2 AA, fallback ladder, 80% logic coverage, licensing, topic extensibility
- [x] `AC-1`–`AC-22` — acceptance criteria covered across unit, integration, E2E, browser and Lighthouse evidence

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass | `conductor/archive/20261124-showcase-mvp/verification/integrated.md` — 103 tests |
| coverage | `pnpm coverage` | pass | 98.6% statements / 91.7% branches / 97.84% functions / 99.11% lines; all 11 logic modules ≥80% |
| lint | `pnpm lint` | pass | 6 pre-existing warnings, 0 errors |
| format | `pnpm fmt:check` | pass | known intermittent exit-5 flake resolved by rerun |
| typecheck | `pnpm typecheck` | pass | exit 0 |
| integration | `pnpm test:integration` | pass | 37 tests |
| build | `pnpm build` | pass | 3 static pages |
| smoke | `pnpm smoke` | pass | 1 test |
| e2e | `pnpm test:e2e` | pass | 17 tests |
| browser | in-app browser skill | pass | WebGPU + forced WebGL visual/console pass; static-preview `/api/*` 404s expected |
| lighthouse | `@perf` E2E | pass | catalog 1.00/1.00/0.96/1.00; lesson 0.95/1.00/0.96/1.00 |

## Media

Demo captured at `b0c0044`: catalog → lesson poster → launched WebGPU heart → aorta hotspot focus with linked prose.

![Perspectra demo: catalog, heart lesson, interactive 3D scene and hotspot-linked prose](https://github.com/user-attachments/assets/1bb8b30e-5f74-4c36-b47c-b9af09603551)

## Review

- **Verdict:** `PASS WITH FINDINGS`
- **Rounds:** 3 review gates (2 fix rounds)
- **Fixed:** 9 findings (7 in round 1, 2 in round 2)
- **Accepted/deferred:** 1 Low finding (badge narrative wording for non-heart lessons, see `review.md`)

## Deviations and risks

- Badge proof is an HMAC-SHA-256 `DataIntegrityProof` shape rather than full W3C cryptographic suite tooling; verification and tamper rejection are tested, but external ecosystem interoperability is out of MVP scope.
- The Worker mirrors heart prose because Workers cannot import MDX at runtime; DB-backed `lesson_embedding` is the real source when `DATABASE_URL` is configured, and `scripts/embed-lessons.ts --write` ingests any MDX lesson.
- The heavy three.js module is deferred until the learner opts in, which keeps the lesson Lighthouse score at the gate; the poster and full prose are immediate.
- Real OAuth, LLM, Cloudflare, Neon ingest and physical WebGPU hardware remain human-only exceptions covered by injected fakes.
- `pnpm fmt:check` intermittently exits 5 while reporting all files correctly formatted; final runs pass on rerun.

## Follow-ups

- Generalize the badge achievement narrative so non-heart lessons do not show "six landmarks"/"heart landmark" prose (`R2-L1`, non-blocking).
- Add a deployment runbook with real Cloudflare/Neon/OAuth/LLM credentials.
- Future roadmap items (multi-topic library, cohorts, deeper assessment) are recorded in `conductor/product.md`.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```

No external migrations are applied by this PR; `migrations/0001_init.sql` is committed for deployment. Reverting the merge removes code and track artifacts; any already-deployed Worker/Neon data must be retired separately.
