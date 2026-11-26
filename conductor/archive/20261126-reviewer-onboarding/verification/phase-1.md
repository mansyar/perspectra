# Phase 1 verification — Global Header & Sign-in Page

- Track: `20261126-reviewer-onboarding`
- Phase: 1 — Global Header & Sign-in Page
- Date: 2026-11-26
- Branch: `feat/20261126-reviewer-onboarding`
- Base: `dd49cd68151af53489b89785374ff9a15630f42b`
- Head at verification: `664df944302ac0f3db2ce841750734a157f755cf`
- Result: **verified** — `pnpm verify` exited 0.

## Verification command

| Command | Exit code | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | All chained checks passed. |

Exact command run: `pnpm verify`. It expands to `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm test && pnpm coverage && pnpm test:integration && pnpm build`.

Command summaries from the passing run:

- `pnpm lint` (`oxlint .`): no errors. Only pre-existing warnings in `src/lib/offline-queue.ts` and `tests/integration/worker-assets.test.ts`; no warnings in Phase 1 files.
- `pnpm fmt:check`: “All matched files use the correct format.”
- `pnpm typecheck` (`astro sync && tsc --noEmit`): clean; includes the new React islands and the E2E specs.
- `pnpm test` / `pnpm coverage` / `pnpm test:integration`: all Vitest suites passed, including 20 new `resolveNext` unit tests. Coverage thresholds unchanged.
- `pnpm build` (`astro build`): 5 static pages generated, including `/sign-in/index.html`. Vite emitted only the pre-existing >500 kB chunk advisory.

The known `fmt:check` flake (exit 5 with “All matched files use the correct format”) did not occur in the passing run. Earlier attempts in this phase failed on a lint rule, formatting, a TS payload union, and a test expectation; each was fixed and the exact command rerun. No config, lockfile, or generated file was changed to make a check pass; `pnpm fmt` was run once on the source files it reported.

## Acceptance criteria mapping (Phase 1 scope)

| ID | Status | Evidence in this phase |
| --- | --- | --- |
| AC-1 | Implemented; browser pass pending | `/` keeps four static controls and zero scripts; `SiteHeader` island mounts once on lesson, verify, and sign-in with the same four controls. `tests/e2e/onboarding.spec.ts` (`@onboarding`) asserts the controls and zero `<script>` on `/`. |
| AC-2 | Implemented; browser pass pending | `/sign-in/` renders email/password fields, Create account, and Google actions; no secret values are rendered. The `@onboarding` E2E spec asserts fields/button/no secret-looking text with `/api/auth/*` mocked to 404. |
| AC-3 | Verified by unit tests | `tests/unit/auth-navigation.test.ts` covers safe root-relative paths, same-origin absolute URLs, `/` default, `//evil`, cross-origin, `javascript:`/`data:`/`blob:`, credentialed URLs, control characters, and query/hash preservation. `SiteHeader` passes a safe `next` from lesson/verify; `SignInPanel` revalidates `next` from `window.location.search`. |
| NFR-1 | Implemented; browser pass pending | Catalog still ships no script/island; header styles reuse existing tokens. Lighthouse is out of Phase 1 scope (AC-7). |
| NFR-2 | Implemented; browser pass pending | Existing global `:focus-visible` and `--focus` reused; light-surface focus ring added for sign-in; reduced-motion block untouched. |
| NFR-3 | Verified | No dependency, package.json, lockfile, env, or secret change. All auth calls are cookie-based fetches to the existing Better Auth endpoints. |
| NFR-4 | Verified | New components contain no lesson/topic-specific logic; `returnTo` and `current` arrive as props. |
| NFR-5 | Implemented; browser pass pending | `.site-header` wraps, nav uses `margin-left: auto` with a `max-width: 30rem` adjustment; identity label ellipsizes. 360px visual check is primary-owned. |

FR-1, FR-2, and FR-3 are covered by the implementation above. AC-4 through AC-8 belong to later phases / primary verification.

## Evidence paths

- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/SignInPanel.tsx`
- `src/components/layout/auth-client.ts`
- `src/lib/auth-navigation.ts`
- `src/pages/sign-in.astro`
- `src/pages/index.astro`
- `src/pages/lessons/[slug].astro`
- `src/pages/verify.astro`
- `src/styles/global.css`
- `tests/unit/auth-navigation.test.ts`
- `tests/e2e/onboarding.spec.ts`

## Deviations

None. Plain `fetch('/api/auth/...', { credentials: 'include' })` was used instead of `createAuthClient()`; the brief explicitly permits this fallback when client typings resist. No provider, dependency, or secret was added.

## Human-only exceptions

Real Google/email credential sign-in and OAuth redirects require live credentials and are deferred to the primary browser pass. GitHub remains deferred; the UI only states it is not offered. Deployment approval, production resets, and WebGPU hardware checks are out of scope.

## Notes for primary

Browser verification is primary-owned and pending: this phase wrote and typechecked the `@onboarding` Playwright specs but did not execute `pnpm verify:full` or Lighthouse. No browser behaviour is claimed here beyond static build output and mocked/unit-tested logic.

## Primary verification

Primary independently reran the exact phase command and confirmed the diff.

| Check | Result |
| --- | --- |
| Working tree before verification | clean |
| `git diff --name-only dd49cd68151af53489b89785374ff9a15630f42b..HEAD` | only the 12 declared Phase 1 files |
| `pnpm verify` | exit `0` |
| `pnpm lint` | 5 pre-existing warnings, 0 errors; none in Phase 1 files |
| `pnpm fmt:check` | clean on the final tree |
| `pnpm typecheck` | clean |
| `pnpm test` | 22 unit files, 208 tests passed |
| `pnpm coverage` | 98.63% statements, 92.89% branches, 97.89% functions, 99.13% lines; all per-file 80% gates pass |
| `pnpm test:integration` | 7 files, 66 tests passed |
| `pnpm build` | 5 static pages, including `/sign-in/index.html` |

The known `oxfmt` exit-5-with-correct-output flake did not occur in the authoritative primary rerun. Result remains VERIFIED for Phase 1; browser proof and Lighthouse remain primary-owned later-phase gates.

