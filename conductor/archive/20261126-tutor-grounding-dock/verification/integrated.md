# Integrated verification — 20261126-tutor-grounding-dock

- Branch: feat/20261126-tutor-grounding-dock
- Head at verification: bdaface
- Date: 2026-11-26 (final rerun after review fix R1)
- Result: pass

## Commands and exit codes

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static + unit + coverage + integration + build | `pnpm verify` (`pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm test && pnpm coverage && pnpm test:integration && pnpm build`) | 0 | Passed. Six pre-existing lint warnings in `src/lib/offline-queue.ts` and `tests/integration/worker-assets.test.ts`; no new warnings. |
| Smoke | `pnpm smoke` | 0 | 2 passed. |
| E2E + Lighthouse | `pnpm test:e2e` | 0 | 44 passed, 1 skipped (production Earth, external origin), including the new error-path no-grounding-label assertion; all Lighthouse budgets met (`/` 1/0.96/1/1, both lesson pages 1/0.96/0.96/1). |

Combined command: `pnpm verify && pnpm smoke && pnpm test:e2e`.

The first two attempts stopped at the known `oxfmt` exit-5 flake after printing "All matched files use the correct format." for 113 files. `pnpm exec oxfmt --check .` directly exited 0; the third full run passed end to end. The post-R1 rerun hit the same format flake once, was confirmed directly with `pnpm exec oxfmt --check .`, and then exited 0 with 44 E2E passed and all Lighthouse budgets met (`verification/phase-R1.md`). No retry thresholds, config, or source files were changed between attempts. The working tree remained clean.

## Coverage

Unit: 22 files / 221 tests, coverage gate met (retrieval.ts 100% lines). Integration: 7 files / 72 tests. Smoke: 2. E2E: 44 passed / 1 skipped, including the 1280×800, 1024×768, 390×844 tutor dock tests and the new review-fix error-path assertion.

## Browser evidence

Primary in-app browser passes are recorded in `verification/browser.md`; they cover sticky dock persistence at 1024px, chip focus binding, mobile sheet, the no-Worker fallback, the review-time recheck, and the post-fix R1 check that no grounding label appears on an error.

## Conclusion

Integrated verification passes on the final branch state. No blocking defects.
