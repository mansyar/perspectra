# Review: Earth Interior Topic Proof

- **Track:** `20261125-earth-interior-proof`
- **Type:** `feature`
- **Branch:** `feat/20261125-earth-interior-proof`
- **Range:** `4b2067b0a4ae657e6339296cbbcaca6bbfb6d322..f0f2dab41e7a61851916f609fceeb1fc7a67ef1d`
- **Date:** `2026-11-25T22:17:46+11:00`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

All FR/NFR/AC requirements are implemented and verified by local, production, Lighthouse,
browser, and secret-hygiene evidence. The reviewer found no Critical, High, or Medium defect.
Three Low findings remain: hardcoded subject names in catalog intro copy, Python style-guide
deviations in the new Blender recipe, and an asset-contract camera-FOV wording mismatch. They
are mechanical/documentation issues and do not block completion under `review.strict=false`.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass | 21 files / 188 tests |
| coverage | `pnpm coverage` | pass | 98.63% stmts / 92.89% branches / 97.89% funcs / 99.13% lines; all 80% per-file gates |
| lint | `pnpm lint` | pass | 5 pre-existing warnings, 0 errors |
| format | `pnpm fmt:check` | pass | 104 files clean; one documented exit-5 flake retried earlier |
| typecheck | `pnpm typecheck` | pass | clean |
| build | `pnpm build` | pass | 4 static pages |
| full local gate | `pnpm verify:full` | pass | 188 unit, 66 integration, 2 smoke, 30 non-perf outcomes, serial `@perf` 3/3 |
| serial perf | `pnpm test:perf` | pass | catalog 1.00, Heart 0.99, Earth 0.95 |
| production E2E | `pnpm test:production --workers=1` | pass | 33/33 against public workers.dev origin |
| production smoke | `node scripts/production-smoke.mjs heart` / `... earth-interior` | pass | 16/16 checks each |
| production Lighthouse | three pages | pass | 1.00 / 1.00 / 0.96 / 1.00 on catalog, Heart, Earth |
| browser | paired Chrome production review | pass | Earth WebGPU, forced WebGL, forced poster, console; see `verification/browser.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T2 | `src/content/lessons/earth-interior.mdx`, `tests/integration/content-contract.test.ts` | covered |
| FR-2 | P2.T1, P2.T2 | `assets/earth-interior/build_earth.py`, `assets/earth-interior/ASSET_CONTRACT.md`, `tests/integration/glb-manifest.test.ts` | covered |
| FR-3 | P2.T2–P2.T5 | `tests/e2e/scene.spec.ts`, `tests/integration/glb-manifest.test.ts`, `verification/browser.md` | covered |
| FR-4 | P1.T3 | `src/pages/index.astro`, `tests/e2e/catalog.spec.ts` | partial — F1 |
| FR-5 | P3.T1, P3.T2 | `api/src/db/seed.ts`, `scripts/embed-lessons.ts`, `tests/integration/embedding-ingestion.test.ts` | covered |
| FR-6 | P3.T3 | tutor/quiz/badge/mastery code and tests, `verification/browser.md`, production smoke | covered |
| FR-7 | P2.T3, P3.T4, P5.T2 | topic-independence audit in `verification/integrated.md` | covered |
| FR-8 | P1–P5 evidence tasks | `verification/*.md`, `docs/DEMO.md`, `scripts/production-smoke.mjs` | covered |
| NFR-1 | P3.T4, P5.T2 | source audit: no Earth-specific runtime branch | covered |
| NFR-2 | P4.T4, P5.T1, P5.T4 | `tests/e2e/performance.spec.ts`, serial `@perf`, production Lighthouse | covered |
| NFR-3 | P2.T4, P4.T4 | `tests/e2e/scene.spec.ts`, `verification/browser.md` | covered |
| NFR-4 | P1.T1, P2.T1, P2.T2, P2.T5, P5.T2 | GLB 935,332 B, WebP 18,410 B, named meshes, desktop/mobile browser | covered |
| NFR-5 | P3.T1, P3.T2, P4.T1, P4.T2 | idempotent seed/embed tests and production additive replay | covered |
| NFR-6 | P4.T2, P5.T2 | sanitized smoke summaries, CI contract, secret audit | covered |
| NFR-7 | P4.T3, P4.T5, P5.T1, P5.T4 | `pnpm verify:full`, production 33/33, both smokes 16/16 | covered |
| AC-1 | P1.T2, P2.T3, P2.T4 | content/scene contract and E2E | covered |
| AC-2 | P2.T2, P2.T4 | GLB/WebP budget + visual review | covered |
| AC-3 | P1.T3 | catalog `@catalog` E2E; no anatomy-only framing | covered |
| AC-4 | P3.T1, P4.T2, P4.T3 | two lessons in production, 18 embeddings each at 1536 dims | covered |
| AC-5 | P3.T3, P4.T3 | tutor citation integration and production SSE smoke | covered |
| AC-6 | P3.T3, P4.T3 | quiz/mastery/badge tests and production badge flow | covered |
| AC-7 | P3.T4, P5.T2 | source grep audit | covered |
| AC-8 | P4.T3–P4.T5, P5.T1, P5.T4 | production E2E, smoke, Lighthouse, browser | covered |
| AC-9 | P4.T2, P5.T2 | secret/tracked-file audit | covered |
| AC-10 | P4.T4, P5.T3 | `docs/DEMO.md`, browser and smoke evidence | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — Catalog intro hardcodes live subject names**
  - **File:** `src/pages/index.astro:44-45`
  - **What:** "Explore the human heart, journey inside Earth" is runtime copy added by this diff; the base copy named only the heart.
  - **Why:** The lesson list is MDX-driven, but this sentence needs hand editing when lessons change. The catalog E2E only checks that anatomy-only framing is absent.
  - **Fix:** Use subject-neutral intro copy, or derive names from the live lesson collection; add an E2E assertion that the intro contains no lesson-specific names.
  - **Requirement:** FR-4 / AC-3
  - **Test gap:** Catalog intro should be topic-neutral in `@catalog`.

- **F2 — Python recipe style-guide deviations**
  - **File:** `assets/earth-interior/build_earth.py:77-333`
  - **What:** 22 lines exceed the 80-character limit and some helpers lack docstrings.
  - **Why:** Binding Python style-guide deviation in all-new deterministic asset code.
  - **Fix:** Wrap the listed lines and add short helper docstrings.
  - **Requirement:** none
  - **Test gap:** none

- **F3 — Asset-contract camera-FOV wording mismatch**
  - **File:** `assets/earth-interior/ASSET_CONTRACT.md:28-29`
  - **What:** The contract says the MDX camera matches the poster camera after conversion, but only position/target match; Blender lens 58 mm on a 960×960 render is about 34.6° versus the runtime FOV 42.
  - **Why:** A rebuild relying on the contract could produce different poster framing.
  - **Fix:** Set the poster lens to about 47 mm, or amend the contract to state that only position/target match and document poster FOV separately.
  - **Requirement:** FR-2 / NFR-4
  - **Test gap:** optional asset-contract assertion for poster framing.

## Overrides

- <none>

## Plan compliance

All five planned phases are verified with checkpoints P1 `f6524e5`, P2 `77ad9a4`, P3
`634648e`, P4 `b5cfd43`, P5 `74afc95`, and 23/23 tasks are checked. The final doc-only commit
is `f0f2dab`. The reviewer noted plan naming drift: the plan names `tests/e2e/earth-scene.spec.ts`
while the added file is `tests/e2e/earth-loop.spec.ts`; this is documentation state only and is
reconciled during post-review sync.

## Out of scope

Conductor prose, generated `dist/**` and `coverage/**`, lockfile, binary assets, and pre-existing
lint warnings were excluded from code review. Two documentation inconsistencies were observed:
`verification/integrated.md` listed a 23,212-byte WebP while git records 18,410 bytes, and its
topic-independence table overstated the `src/*.astro` search while `index.astro` intentionally
contains the word "Earth" in the intro. Both are state/documentation issues, reconciled during
post-review sync.

## Debt

- F1 — deferred: subjective copy/generic derivation improvement; AC-3 is already covered and strict mode is off.
- F2 — deferred: Python line-length/docstring style cleanup in the asset recipe; no runtime or correctness impact.
- F3 — deferred: poster FOV wording only; visual and budget acceptance already passed.

`review.issues.min_severity` is `medium`, so no Low finding is filed as an issue.

## Doc sync

`updated` — post-review sync reconciled the recorded WebP size (18,410 bytes), clarified the
topic-independence wording, corrected the plan E2E filename, and left product definition and
product guidelines unchanged.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 3 | 0 |
