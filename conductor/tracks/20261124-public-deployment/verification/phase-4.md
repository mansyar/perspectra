# Phase 4 verification — production preparation fix

- Track: `20261124-public-deployment`
- Phase: `4`
- Date: 2026-11-24
- Branch: `chore/20261124-public-deployment`
- Base: `35ffadd4a059020c5850f5a0e747c105f222afe1`
- Preparation head: `792e9f31a60980a25917ac0dedd24326c3e10bd2`
- Result: **preparation verified locally; production deployment evidence pending primary**

## Preparation

### Defect

The primary's manual deployment attempt failed before uploading the Worker:

```text
The entry-point file at "api\src\index.ts" was not found.
```

The generated private config lives at `.conductor/deploy/wrangler.toml`. Wrangler resolves the
root-relative `main` and `[assets].directory` values copied from the committed template relative to
that generated config location, so it looked beneath `.conductor/deploy/` instead of the project
root.

### Fix

- `scripts/prepare-deploy.mjs` now derives the project root from its own module location and resolves
  `main` to the project `api/src/index.ts` and `[assets].directory` to the project `dist`.
- Generated paths are absolute and normalized with forward slashes so they remain valid TOML strings
  on Windows and other platforms.
- Path rewriting happens only after existing committed-placeholder and private-id validation. All
  placeholder validation, public exports, output location, and no-id logging behavior are preserved.
- The committed `wrangler.toml` remains unchanged and root-relative.
- `docs/DEPLOYMENT.md` now explains why the generated subdirectory config resolves these two paths
  itself.

### Regression coverage

`tests/unit/prepare-deploy.test.ts` now proves:

- the generated `main` and assets directory values are absolute, normalized, and exactly the
  expected project locations;
- path rewriting and KV placeholder replacement are the only generated-config differences from the
  committed template;
- existing missing/malformed/zero-id rejection, no-id error echoing, refusal to overwrite a real
  committed id, other-namespace placeholder preservation, production-wrapper behavior, and package
  script wiring still pass.

The updated tests were first run against the old implementation as a red baseline: **2 failed, 7
passed**, with failures showing root-relative `main` and assets paths. After the fix, the focused
suite passed **9 of 9 tests**.

## Verification

Exact required command:

```text
pnpm verify
```

Final run exited `0`:

- Lint passed with six pre-existing warnings: two `no-array-sort` warnings in `glb-manifest.test.ts`
  and four `prefer-add-event-listener` warnings in `offline-queue.ts`.
- Format check passed across 96 files.
- TypeScript/Astro typecheck passed.
- Unit tests: **19 files, 173 tests passed**.
- Coverage: **98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines**.
- Integration tests: **7 files, 45 tests passed**.
- Astro production build passed with **3 pages**; the existing large-chunk warning remained
  non-blocking.
- `git diff --check` passed with no output.

The first `pnpm verify` attempt stopped at a real formatting issue in the updated test file. `pnpm fmt`
was run once, then the exact `pnpm verify` command was rerun successfully. This was not the known
exit-5-with-all-files-correct flake.

## Scope and safety

- Commit: `792e9f31a60980a25917ac0dedd24326c3e10bd2` —
  `fix(deploy): resolve generated Wrangler project paths`.
- Changed only `scripts/prepare-deploy.mjs`, `tests/unit/prepare-deploy.test.ts`, and
  `docs/DEPLOYMENT.md` before this evidence file.
- No package, lockfile, workspace, committed Wrangler template, source application, schema,
  migration, or coverage configuration was changed.
- No deployment command was run, no Cloudflare/Neon resource was changed, and
  `.conductor/deploy/production.env` was not read.
- No secret, credential, account id, private KV id, Neon URL, or real domain was recorded.

## Requirement mapping

| Requirement | Preparation result |
| --- | --- |
| P4.T1 preparation portion | Met locally: generated config now resolves project entry/assets paths and regression tests prove the result. |
| FR-8 | Supported: the documented generated-config deployment step no longer carries the known path-resolution defect. |
| AC-10 | Supported locally: repeatable preparation, clear validation, no committed production values, and passing configured local checks. |
| NFR-5 | Met: preparation fails clearly for invalid config/id inputs and now emits paths independent of the caller's working directory. |
| NFR-8 | Human account, credential, approval, deploy, and public-origin verification remain primary-owned. |

## Deviations

None.

## Human-only exceptions and production follow-up

- The primary will append actual deployment and production-origin evidence to this file.
- Production deployment, production E2E/Lighthouse, browser/console checks, and OAuth/email auth
  verification were not performed by this preparation subagent.
- GitHub OAuth remains explicitly deferred by the user; Google OAuth and email/password remain in
  scope for the primary's production verification.
- P4.T2 through P4.T5 remain outside this subagent's preparation-only brief.
