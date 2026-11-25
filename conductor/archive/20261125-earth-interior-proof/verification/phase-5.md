# Phase 5 Evidence — Integrated Proof & Documentation

- **Branch:** `feat/20261125-earth-interior-proof`
- **Phase base:** `5e81798b904541796284b5acf874306004730a30`
- **Checkpoint:** `74afc950e83da5fa9b976bb9d20ff62d53b13722`
- **Status:** `verified` locally and in production; executor's first audit failure was resolved by removing disposable Playwright Chrome processes

## P5.T4 — verification pipeline split

- `package.json`: added `test:perf` = `playwright test --grep @perf --workers=1`; `verify:full` now runs `pnpm verify && pnpm smoke && pnpm exec playwright test --grep-invert @perf && pnpm test:perf`. `test:e2e`, `perf:lighthouse`, thresholds, retries, config files, and lockfile unchanged.
- `.github/workflows/ci.yml`: e2e job runs the same split and keeps its one-retry logic.
- `tests/unit/ci-contract.test.ts`: asserts the CI chain and the three package scripts (185 → 188 unit tests).
- Docs: `README.md`, `docs/DEMO.md`, `docs/DEPLOYMENT.md` describe the serial perf gate.

## Final verification

Exact command: `pnpm verify:full`

First attempt: exit 1 at `oxfmt --check` with `All matched files use the correct format.` on 104 files followed by `[ELIFECYCLE] Command failed with exit code 5.` — the known formatter flake. One permitted rerun was used.

Executor's final-tree rerun: exit 1 only because Heart and Earth fell below the unchanged 0.95
performance budget under CPU contention from leftover Playwright test Chrome processes. All
other stages passed: lint (pre-existing warnings only), format, typecheck, 21 unit files /
188 tests, coverage 98.63/92.89/97.89/99.13 with 80% per-file gates, 7 integration files /
66 tests, four-page build, two smoke tests, and 29 non-perf Playwright passes with one
production-only skip. Executor output:
`C:\Users\Ansyar\.local\share\opencode\shell\50ce724efc94a9b6112c778c8a7e31212e06687c\sh_212581793001MjqmGSpETrXqPw.out`

Primary final verification: the disposable Playwright Chrome roots and their test daemon were
terminated without touching the user's Chrome. Focused `pnpm test:perf` passed 3/3 (catalog
1.00, Heart 0.99, Earth 0.99 performance). Final `pnpm verify:full` then exited 0: 188 unit
tests, 66 integration tests, four-page build, two smoke tests, 30 non-perf Playwright outcomes
(29 passed, one production-only skip), and serial `@perf` 3/3 (catalog 1.00, Heart 0.99,
Earth 0.95). Thresholds, retries, assertions, Playwright config, and Lighthouse config remained
unchanged. Authoritative output:
`C:\Users\Ansyar\AppData\Local\Temp\opencode\earth-verify-full-final.log`

## Audits

Secrets, asset provenance, topic independence, and scope guard were audited read-only with no findings; detailed tables are in [`integrated.md`](integrated.md). No deployment, private env access, lockfile change, or Conductor state edit occurred.

## References

- Production results, coverage, Lighthouse, phase roll-up, fallbacks, and human-only exceptions: [`integrated.md`](integrated.md)
- Production browser proof: [`browser.md`](browser.md)
