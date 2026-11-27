# Integrated Verification

**Track:** `20261127-scene-stage-reframing`  
**Date:** 2026-11-27  
**Head:** `2f54fd2`

**Result:** Pass

## Commands

```bash
pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e && pnpm test:a11y
node .conductor/evidence/phase-3-browser.mjs
```

## Result

- Exact configured chain: passed with exit 0 — lint (five pre-existing warnings only), format (114 files), typecheck, build (5 pages), 23 unit files / 242 tests, coverage gate, 7 integration files / 96 tests, smoke 2 tests, E2E 70 passed / 1 external-origin skipped, and a11y 7 tests.
- `node .conductor/evidence/phase-3-browser.mjs`: passed — 8 primary browser checks across both lessons at desktop/mobile and reduced motion, with no page errors.
- Lighthouse budgets unchanged and met: catalog `100/96/100/100`, Heart `100/96/99/100`, Earth `100/96/98/100`.

## Verification notes

Earlier attempts reproduced the documented CPU-contention Lighthouse flake, an unrelated mobile-tutor hydration flake, a stale Astro preview lock, and the known false `oxfmt` exit-5 result after reporting all files formatted. The R1 formatting defect found on the first final run was fixed in `024ad13`; a direct format check exited 0, the stale preview was stopped, and the exact chain then passed end to end. No thresholds, retries, configuration, or assertions were changed.

## Coverage

- FR-1–FR-9
- NFR-1–NFR-7
- AC-1–AC-9

Primary browser evidence remains in `verification/browser.md`. Phase-specific evidence is in `verification/phase-1.md` through `verification/phase-4.md`; review-fix evidence is in `verification/phase-R1.md`.
