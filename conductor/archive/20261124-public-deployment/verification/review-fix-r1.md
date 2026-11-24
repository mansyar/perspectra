# Review fix round 1 evidence

- Track: `20261124-public-deployment`
- Branch: `chore/20261124-public-deployment`
- Base: `ff72759a704d60941732f9b02bd55d0af12b4e1d`
- Date: 2026-11-25
- Result: **PASS**
- Runtime behavior changed: **No**

## Findings

| Finding | Status | Resolution |
| --- | --- | --- |
| F1 | FIXED | Deployment prerequisites, required credentials, and production verification now require only Google OAuth and email/password. GitHub OAuth is explicitly deferred by the user. README and architecture wording match that release scope while retaining the provider code and optional environment names. |
| F2 | FIXED | `api/src/env.ts` now documents the `gemini-3.5-flash` adapter default and the possible production override `gemini-3.5-flash-lite`. |
| F3 | FIXED | Integrated evidence NFR-1 now cites the section 5 secret/placeholder audit plus `tests/unit/config-check.test.ts` and `tests/unit/prepare-deploy.test.ts`. |

No tests were added, removed, or weakened. No deployment or production command was run, and private `.conductor/deploy/**` content was not read.

## Verification

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm fmt` | 0 | Formatted 98 files successfully |
| `pnpm verify` (first run) | 1 | Stopped at the known `oxfmt` exit-5 flake after reporting all files correctly formatted; no later gate ran |
| `pnpm verify` (permitted rerun) | 0 | Full local verification passed |
| `git diff --check` | 0 | No whitespace errors |

The passing `pnpm verify` rerun completed lint, format, typecheck, unit tests, coverage, integration tests, and build:

- Lint passed with seven non-blocking existing warnings.
- Format check passed across 98 files.
- Typecheck passed.
- Unit: 21 files, 177 tests passed.
- Coverage: 98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines.
- Integration: 7 files, 46 tests passed.
- Astro build: 3 pages built; existing large-chunk warning only.

## Files changed

- `docs/DEPLOYMENT.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `api/src/env.ts`
- `conductor/tracks/20261124-public-deployment/verification/integrated.md`
- `conductor/tracks/20261124-public-deployment/verification/review-fix-r1.md`

## Primary verification

The primary independently confirmed the diff contains only the six allowed files and reran the exact verification command:

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm verify` (first primary run) | 1 | Hit the known `oxfmt` exit-5 flake after reporting all files correctly formatted; no later gate ran |
| `pnpm verify` (permitted rerun) | 0 | Lint, format, typecheck, 177 unit tests, coverage, 46 integration tests, and 3-page build all passed |

Coverage remained 98.61% statements / 92.41% branches / 97.84% functions / 99.12% lines. No runtime, deployment, or production data was touched.

## Deviations

None.
