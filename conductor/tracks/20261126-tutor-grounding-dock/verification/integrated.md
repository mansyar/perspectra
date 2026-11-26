# Integrated verification — 20261126-tutor-grounding-dock

- Branch: feat/20261126-tutor-grounding-dock
- Head at verification: 8fa1a88
- Date: 2026-11-26
- Result: pass

## Commands and exit codes

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static + unit + coverage + integration + build | `pnpm verify` (`pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm test && pnpm coverage && pnpm test:integration && pnpm build`) | 0 | Passed. Six pre-existing lint warnings in `src/lib/offline-queue.ts` and `tests/integration/worker-assets.test.ts`; no new warnings. |
| Smoke | `pnpm smoke` | 0 | 2 passed. |
| E2E + Lighthouse | `pnpm test:e2e` | 0 | 43 passed, 1 skipped (production Earth, external origin); all Lighthouse budgets met (`/` 1/0.96/1/1, both lesson pages 1/0.96/0.96/1). |

Combined command: `pnpm verify && pnpm smoke && pnpm test:e2e`.

The first two attempts stopped at the known `oxfmt` exit-5 flake after printing "All matched files use the correct format." for 113 files. `pnpm exec oxfmt --check .` directly exited 0; the third full run passed end to end. No retry thresholds, config, or source files were changed between attempts. The working tree remained clean.

## Coverage

Unit: 22 files / 221 tests, coverage gate met (retrieval.ts 100% lines). Integration: 7 files / 72 tests. Smoke: 2. E2E: 43 passed / 1 skipped, including the new 1280×800, 1024×768, 390×844 tutor dock tests.

## Browser evidence

Primary in-app browser pass is recorded in `verification/browser.md`; it covers sticky dock persistence at 1024px, chip focus binding, mobile sheet, and the no-Worker fallback. A fresh browser pass will be repeated at review and after any fix round.

## Conclusion

Integrated verification passes on the final branch state. No blocking defects.
