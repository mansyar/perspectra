# Integrated Verification

**Track:** `20261127-scene-stage-reframing`  
**Date:** 2026-11-27  
**Head:** `54394b8`  
**Result:** Pass

## Commands

```bash
pnpm verify && pnpm smoke && pnpm exec playwright test --workers=1
pnpm test:a11y
```

## Result

- `pnpm verify`: passed — lint (five pre-existing warnings only), format, typecheck, build (5 pages), 23 unit files / 242 tests, coverage gate, and 7 integration files / 90 tests.
- `pnpm smoke`: passed — 2 tests.
- `pnpm exec playwright test --workers=1`: passed — 70 passed, 1 skipped (`@production-earth`, external origin), exit 0.
- `pnpm test:a11y`: passed — 7 tests.
- Lighthouse budgets unchanged and met in the serial run: catalog `100/96/100/100`, Heart `100/96/98/100`, Earth `100/96/98/100`.

## Verification notes

The first fresh chained attempt passed `pnpm verify` and smoke, then the serial Playwright process was interrupted after 17 tests by the environment (`Command was killed: the process daemon stopped`). A fresh standalone serial run completed all 70 tests successfully with exit 0. Earlier parallel E2E attempts reproduced the documented CPU-contention Lighthouse flake and one unrelated mobile-tutor hydration flake; no thresholds, retries, configuration, or assertions were changed. The complete serial suite and dedicated accessibility suite are green.

## Coverage

- FR-1–FR-9
- NFR-1–NFR-7
- AC-1–AC-9

Primary browser evidence remains in `verification/browser.md`. Phase-specific evidence is in `verification/phase-1.md` through `verification/phase-4.md`.
