# Phase 1 Verification — Earth Content & Catalog Contract

- **Track:** `20261125-earth-interior-proof` — Earth Interior Topic Proof
- **Phase:** 1 — Earth Content & Catalog Contract
- **Date:** 2026-11-25
- **Branch:** `feat/20261125-earth-interior-proof`
- **Base:** `85023111aed4d4114fb98a33cda1038c32cc70a9`
- **Implementation head:** `bf1ea99` (the evidence commit SHA is returned in the phase report)
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Initial verification | `pnpm verify` | 1 | Lint passed; formatting check identified the four new or edited content/catalog/test files. Later stages did not run. |
| Formatting fix (primary) | `pnpm exec oxfmt src/content/lessons/earth-interior.mdx src/pages/index.astro tests/e2e/catalog.spec.ts tests/integration/content-contract.test.ts` | 0 | Formatted only the four touched files. |
| Full integration (primary) | `pnpm test:integration` | 1 | All 47 executed tests passed; the suite then failed solely because the Phase 2 Earth poster does not exist yet: `ENOENT public/assets/earth-interior/earth-poster.webp`. No test was weakened. |
| Approved Phase 1 verification (primary) | `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm test && pnpm coverage && pnpm test:integration tests/integration/content-contract.test.ts && pnpm build && pnpm exec playwright test --grep '@catalog'` | 0 | Lint: 0 errors and 7 pre-existing warnings. Formatting: 100 files. Typecheck: clean. Unit tests: 177 passed. Coverage: 98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines. Content-contract integration: 11 passed. Build: four pages. Catalog E2E: 1 passed. |

The primary recorded the content-focused verification command in primary-owned
`plan.md` commit `f523ed9`. That state file was not edited by the phase subagent.

## Verification Scope

Phase 1 proves the lesson content, generic manifest contract, production build, and
topic-neutral catalog. Phase 2 owns the Earth GLB/poster, named-mesh asset contract,
renderer integration, fallback behavior, and visual-quality review.

The full integration suite includes asset-readiness checks that intentionally require
the Phase 2 Earth files. The approved Phase 1 chain therefore runs the complete
content-contract integration file directly instead of claiming that unavailable assets
are ready. The build and catalog E2E still run against the real two-lesson collection.
No assertions were removed or relaxed to obtain the passing result.

## Acceptance Criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Earth renders six working hotspots with matching prose and valid build-time contracts. | `earth-interior.mdx` declares the six required IDs and matching layered sections. The generalized integration contract validates every MDX lesson with `sceneManifestSchema` and `validateHotspotReferences`; all 11 content-contract tests and the build passed. Runtime hotspot/rendering proof remains Phase 2. | verified for Phase 1 scope |
| AC-3 | Catalog presents Cardiovascular and Earth Science without anatomy-only hero copy. | Neutral metadata, hero, intro, and plural heading are present in `src/pages/index.astro`; topic labels are derived generically. The catalog E2E verified both live lesson cards and zero script tags. | verified |
| FR-1 | Complete Earth MDX with six validated hotspots, layered explanations, and sources. | `src/content/lessons/earth-interior.mdx` includes overview/detail/context prose and NASA/USGS sources; content-contract integration passed. | verified |
| FR-4 | Generalize catalog and lesson framing for multiple subjects. | Catalog implementation, E2E coverage, and README onboarding wording are updated; the revised verification chain passed. | verified |
| NFR-4 | Visual quality and asset provenance are reviewed. | No 3D assets were created in Phase 1; visual and asset review belongs to Phase 2. NASA/USGS are factual references only, and no third-party media is shipped. | deferred to Phase 2 |
| FR-8 | Produce local verification evidence and updated docs. | The approved content-focused verification chain exited 0; this evidence file and README updates are committed. | verified |

## Task Commits

- `44e4f15` — `feat(content): add Earth interior lesson`
- `5e7bda8` — `test(content): validate every lesson manifest`
- `c093b69` — `feat(catalog): present multiple science topics`
- `7d224c4` — `docs(conductor): record phase 1 verification blocker` (superseded by this evidence)
- `bf1ea99` — `style: format phase 1 content and tests`

Primary-owned verification-plan update: `f523ed9` — `conductor(plan): Separate content verification from asset readiness`.

## Evidence Paths

- `conductor/tracks/20261125-earth-interior-proof/verification/phase-1.md`
- `src/content/lessons/earth-interior.mdx`
- `src/pages/index.astro`
- `tests/integration/content-contract.test.ts`
- `tests/e2e/catalog.spec.ts`
- `README.md`

## Deviations

None.

## Notes

- The primary ran the formatter and revised verification successfully; the follow-up subagent committed those results without rerunning or weakening checks.
- No Earth-specific TypeScript branches or constants were added. Catalog topic labels are derived generically from hyphenated or underscored slugs.
- The heart card and its ordering are preserved; the catalog remains script-free in source and in the passing E2E assertion.
- No Earth GLB, poster, or other 3D asset was created; Phase 2 owns those paths and the remaining runtime/visual acceptance evidence.
- The seven lint warnings are pre-existing and outside this phase's touches.
