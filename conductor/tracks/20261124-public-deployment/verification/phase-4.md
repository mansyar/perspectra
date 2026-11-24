# Phase 4 verification — production preparation fix

- Track: `20261124-public-deployment`
- Phase: `4`
- Preparation date: 2026-11-24
- Follow-up date: 2026-11-25
- Branch: `chore/20261124-public-deployment`
- Preparation base/head: `35ffadd4a059020c5850f5a0e747c105f222afe1` / `792e9f31a60980a25917ac0dedd24326c3e10bd2`
- Follow-up base/head: `f7ec177cf710d1bf544b678325070d2e79810901` / `8c96f365583fc55d6cfbedfa04bac2f57f777316`
- Result: **preparation and Worker entry-point fix verified locally; production redeploy evidence pending primary**

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

## Follow-up: Cloudflare Worker default entry point

### Production symptom

After the preparation fix allowed deployment, static `/` returned `200`, but `/health` and `/api/*`
returned Cloudflare `error code: 1042`. The failure persisted even with
`assets.run_worker_first = true`.

### Root cause

`api/src/index.ts` exported only the named `app`. Cloudflare Workers requires a default export as
the module entry point. Without it, Workers Static Assets could serve `/`, but the Hono Worker was
not invoked for API requests.

### Fix

- Added `export default app;` while preserving the existing named `app` export used by tests and
  dependency-injection callers.
- Left the committed root-relative Wrangler template, generated absolute config paths, Hono routes,
  and asset fallback unchanged.

### Regression coverage

`tests/integration/worker-assets.test.ts` now imports the module's default and named entry points,
asserts they are the same Hono app, and verifies the default export has a callable `fetch` method.
All five existing asset-fallback tests remain unchanged and passing. The follow-up integration
suite contains **46 tests**, up from 45.

## Verification

Exact required command:

```text
pnpm verify
```

Preparation verification on 2026-11-24 exited `0` after formatting the updated test: lint,
format, typecheck, **173 unit tests**, coverage, **45 integration tests**, and the **3-page** Astro
build passed. Coverage was **98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines**.

The final follow-up run on 2026-11-25 exited `0`:

- Lint passed with six pre-existing warnings: two `no-array-sort` warnings in `glb-manifest.test.ts`
  and four `prefer-add-event-listener` warnings in `offline-queue.ts`. The new entry-point identity
  test also produced one non-blocking `no-shadow` warning for its imported `app` name.
- Format check passed across 96 files.
- TypeScript/Astro typecheck passed.
- Unit tests: **19 files, 173 tests passed**.
- Coverage: **98.61% statements, 92.41% branches, 97.84% functions, 99.12% lines**.
- Integration tests: **7 files, 46 tests passed**.
- Astro production build passed with **3 pages**; the existing large-chunk warning remained
  non-blocking.
- `git diff --check` passed with no output.

After the passing follow-up run, an optional alias-only lint cleanup was attempted. The known
`oxfmt` exit-5-with-all-files-correct flake recurred on the permitted rerun, so that optional cleanup
was reverted. The final committed source/test tree is identical to the tree that passed `pnpm verify`.

## Scope and safety

- Preparation commit: `792e9f31a60980a25917ac0dedd24326c3e10bd2` —
  `fix(deploy): resolve generated Wrangler project paths`.
- Follow-up commit: `8c96f365583fc55d6cfbedfa04bac2f57f777316` —
  `fix(api): export Hono app as Worker default`.
- The follow-up changed only `api/src/index.ts` and `tests/integration/worker-assets.test.ts` before
  this evidence update.
- No package, lockfile, workspace, committed Wrangler template, unrelated source, schema,
  migration, or coverage configuration was changed.
- No deployment command was run, no Cloudflare/Neon resource was changed, and
  `.conductor/deploy/production.env` was not read.
- No secret, credential, account id, private KV id, Neon URL, or real domain was recorded.

## Requirement mapping

| Requirement | Preparation result |
| --- | --- |
| P4.T1 preparation portion | Met locally: generated config now resolves project entry/assets paths and regression tests prove the result. |
| Worker entry-point follow-up | Met locally: the module now exposes the same Hono app as both named and default exports, with identity/fetch regression coverage. |
| FR-1 | Supported: the Worker module now has the default entry point required to execute behind Workers Static Assets. |
| FR-2 | Supported: API-first Hono routing can now be invoked by Cloudflare instead of failing with error 1042; public-origin proof remains primary-owned. |
| AC-1 / AC-2 | Supported locally by entry-point and existing asset-fallback tests; production `/health`, `/api/*`, and 404 smoke checks remain primary-owned. |
| FR-8 | Supported: the documented generated-config deployment step no longer carries the known path-resolution defect. |
| AC-10 | Supported locally: repeatable preparation, clear validation, no committed production values, and passing configured local checks. |
| NFR-5 | Met: preparation fails clearly for invalid config/id inputs and now emits paths independent of the caller's working directory. |
| NFR-8 | Human account, credential, approval, deploy, and public-origin verification remain primary-owned. |

## Deviations

None.

## Human-only exceptions and production follow-up

- The primary will append redeployment and production-origin evidence to this file, including proof
  that `/health` and `/api/*` no longer return Cloudflare error 1042.
- Production redeployment, production E2E/Lighthouse, browser/console checks, and OAuth/email auth
  verification were not performed by this preparation subagent.
- GitHub OAuth remains explicitly deferred by the user; Google OAuth and email/password remain in
  scope for the primary's production verification.
- P4.T2 through P4.T5 remain outside this subagent's preparation-only brief.

## Primary verification — 2026-11-25

The primary independently repeated the required local verification after the subagent report:

```text
git status --short
git diff --name-only f7ec177..HEAD
pnpm verify
```

- Working tree was clean before verification.
- The follow-up diff contained only `api/src/index.ts`, `tests/integration/worker-assets.test.ts`, and this evidence file.
- `pnpm verify` exited `0`: six non-blocking lint warnings, 96 formatted files, clean typecheck, 173 unit tests, coverage 98.61% statements / 92.41% branches / 97.84% functions / 99.12% lines, 46 integration tests, and a 3-page production build.
- The build retained the existing >500 kB chunk warning; it did not fail verification.

Local entry-point verification is complete. Production redeploy and origin smoke checks remain primary-owned and will be appended after the fixed Worker is uploaded.
