## Summary

This track makes Perspectra usable by a reviewer without an account. A persistent header exposes
Lessons, Verify, and Sign in on every page while keeping the catalog zero-JS; a dedicated
`/sign-in` page reuses Better Auth email/password and Google, validates same-origin return URLs,
and shows account/sign-out state. Mastery and quiz CTAs link back to sign-in with the lesson return
URL, verifier copy is truthful in production/static preview, and coming-soon labels no longer run
into their topic names.

## Track

- **ID:** `20261126-reviewer-onboarding`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261126-reviewer-onboarding/spec.md`](conductor/archive/20261126-reviewer-onboarding/spec.md)
- **Plan:** [`conductor/archive/20261126-reviewer-onboarding/plan.md`](conductor/archive/20261126-reviewer-onboarding/plan.md)
- **Review:** [`conductor/archive/20261126-reviewer-onboarding/review.md`](conductor/archive/20261126-reviewer-onboarding/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Global Header & Sign-in Page | Shared header, dedicated sign-in, validated return URL | verified | `f2442bb` | Catalog stays zero-JS; plain cookie-backed `fetch` fallback used instead of `createAuthClient`. |
| 2: Inline CTAs & Trust Copy | Mastery/quiz sign-in CTAs, truthful verifier, clean coming-soon labels | verified | `1a2cea9` | `signInHref` helper reused; 360px assertions added. |
| 3: Browser Proof & Final Gates | Complete local/browser evidence with unchanged budgets | verified | `874f4e9` | `get-session` test double fixed learning-loop console assertions; four-surface browser pass. |
| R1: Review Fixes | Resolve F1 stale account state after header sign-out | verified | `ee3b667` | `SignInPanel` subscribes to `SESSION_CHANGE_EVENT`; authenticated-state E2E added. |

## Requirements

- [x] `FR-1` — global header on catalog, lesson, verify, sign-in (`tests/e2e/onboarding.spec.ts`)
- [x] `FR-2` — `/sign-in` email/password, Google, account/sign-out (`tests/e2e/onboarding.spec.ts`, R1 fix)
- [x] `FR-3` — same-origin `next` validation (`tests/unit/auth-navigation.test.ts`)
- [x] `FR-4` — anonymous mastery/quiz sign-in CTAs (`tests/e2e/onboarding.spec.ts`)
- [x] `FR-5` — truthful verifier copy and secondary sample button (`tests/e2e/onboarding.spec.ts`)
- [x] `FR-6` — coming-soon label separation at desktop and 360px (`tests/e2e/onboarding.spec.ts`)
- [x] `FR-7` — browser evidence for all four surfaces (`verification/browser.md`)
- [x] `NFR-1` — unchanged Lighthouse budgets; catalog zero-JS
- [x] `NFR-2` — WCAG 2.2 AA, keyboard focus, reduced motion
- [x] `NFR-3` — no new dependencies or secrets; existing Better Auth reused
- [x] `NFR-4` — no topic-specific runtime logic
- [x] `NFR-5` — responsive at 360px+
- [x] `NFR-6` — no deploy, data reset, custom domain, or auto-deploy
- [x] `AC-1`–`AC-8` — see `review.md` requirement table

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass — 22 files / 214 tests | `conductor/archive/20261126-reviewer-onboarding/verification/integrated.md` |
| coverage | `pnpm coverage` | pass — 98.63/92.89/97.89/99.13%, per-file 80% gates | same |
| integration | `pnpm test:integration` | pass — 7 files / 66 tests | same |
| lint | `pnpm lint` | pass — 0 errors, 5 pre-existing warnings | same |
| format | `pnpm fmt:check` | pass — 111 files | same |
| typecheck | `pnpm typecheck` | pass | same |
| build | `pnpm build` | pass — 5 static pages | same |
| full | `pnpm verify:full` | pass — executor final run exit 0; primary focused perf pass | `verification/review-fix-r1.md` |
| browser | primary in-app browser | pass — catalog, lesson, `/sign-in`, `/verify` | `verification/browser.md`, `verification/review-fix-r1.md` |
| Lighthouse | `@perf` | catalog 1.00, Heart 0.99, Earth 0.98–0.99 performance; unchanged thresholds | `verification/integrated.md` |

## Media

![Reviewer onboarding demo](https://github.com/user-attachments/assets/c19358dd-b4d9-4c75-be47-649eb1ed76f1)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 1 finding (F1 — stale signed-in panel after header sign-out)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Browser proof used the built local artifact; the scope guard forbids deployment changes, so the
  public workers.dev origin is not automatically updated by this PR. Live Google/email credential
  sign-in remains human-only.
- Static-preview `/api/auth/*` and `/api/mastery` 404s are expected because no Worker is attached
  to the preview; the UI handles them gracefully.
- The known `oxfmt` exit-5-with-correct-output flake and Lighthouse timing variance were recorded;
  thresholds, retry counts, and configuration were not changed.

## Follow-ups

- Roadmap `RM-9` — sticky tutor dock and reliable hotspot-grounded answers.
- Roadmap `RM-10` — larger 3D stage with interaction hints and calmer motion.
- Roadmap `RM-11` — catalog poster thumbnails and neutral hero copy.
- Roadmap `RM-12` — anonymous mastery clarity and persistent reading navigation.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit ee3b667f13897784cd0b45dc78616ad5412020c9
```

No migration or data changes; authentication reuses existing Better Auth tables and providers.
