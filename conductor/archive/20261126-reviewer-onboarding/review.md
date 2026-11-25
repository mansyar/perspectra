# Track review — Reviewer Onboarding & Trust

- Track: `20261126-reviewer-onboarding`
- Type: `feature`
- Branch: `feat/20261126-reviewer-onboarding`
- Range: `96920affde115b46a40d4f2398a3079dfea89eea..e6d495c892a34dad4aff654b420fcba7c6ed4e9c`
- Date: `2026-11-26T10:08:34+11:00`
- Verdict: **PASS**

## Summary

The onboarding surfaces are implemented as specified: a zero-JS static catalog header, a
dedicated `/sign-in` page with validated same-origin `next`, anonymous mastery/quiz CTAs,
truthful verifier copy, and separated coming-soon labels. The single Medium finding from the
first review (stale account state after header sign-out on `/sign-in/`) was fixed in R1 and
verified by a mocked authenticated-state E2E case and browser recheck. No Critical or High
issue blocks the track.

## Verification

| Layer | Command | Result |
| --- | --- | --- |
| unit | `pnpm test` | 22 files / 214 tests passed (exit 0). |
| coverage | `pnpm coverage` | 98.63% stmts / 92.89% branches / 97.89% funcs / 99.13% lines; per-file 80% gates pass. |
| lint | `pnpm lint` | 0 errors; 5 pre-existing warnings outside changed files. |
| format | `pnpm fmt:check` | clean on 111 files. |
| typecheck | `pnpm typecheck` | clean. |
| build | `pnpm build` | 5 static pages. |
| full | `pnpm verify:full` | authoritative primary rerun exit 0: 2 smoke, 35 passed + 1 skipped non-perf E2E, 3 perf with one allowed flaky retry; Lighthouse `/` 1.00/1.00/0.96/1.00, Heart 0.99/1.00/0.96/1.00, Earth 0.98/1.00/0.96/1.00 at unchanged thresholds. |
| browser | primary in-app browser | PASS on catalog, lesson, `/sign-in`, `/verify`; expected static-preview `/api/*` 404s only. |

## Requirements

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 | covered | P1.T1; `SiteHeader.tsx`, static catalog header; `@onboarding`/`@catalog` E2E, `browser.md`. |
| FR-2 | covered | P1.T2/T3, R1.T1; `SignInPanel.tsx`, `auth-client.ts`; E2E and browser checks, including header sign-out state sync. |
| FR-3 | covered | P1.T2/T3; `src/lib/auth-navigation.ts`, `tests/unit/auth-navigation.test.ts`. |
| FR-4 | covered | P2.T1/T2; `MasteryPanel.tsx`, `QuizPanel.tsx`, `signInHref`, `@onboarding` E2E. |
| FR-5 | covered | P2.T3; `verify.astro`, truthful copy, shared token button, browser. |
| FR-6 | covered | P2.T4; `index.astro`, `global.css`, desktop/360px E2E. |
| FR-7 | covered | P3.T2/T4; `browser.md`, `integrated.md`. |
| NFR-1 | covered | zero-JS catalog E2E; unchanged Lighthouse budgets. |
| NFR-2 | covered | `@a11y` E2E and browser pass. |
| NFR-3 | covered | no new deps/secrets; cookie-backed existing Better Auth endpoints. |
| NFR-4 | covered | no topic-specific runtime logic in onboarding files. |
| NFR-5 | covered | 360px coming-soon and header assertions. |
| NFR-6 | covered | no deployment, data reset, or env change. |
| AC-1 | covered | header controls + zero scripts. |
| AC-2 | covered | sign-in reachable; fields/Google present; no secrets in DOM. |
| AC-3 | covered | same-origin `next` tests. |
| AC-4 | covered | mocked 401 mastery/quiz CTA tests. |
| AC-5 | covered | verifier copy and secondary button. |
| AC-6 | covered | coming-soon separation desktop/mobile. |
| AC-7 | covered | `verify:full` exit 0 and browser console pass. |
| AC-8 | covered | scope/secret audit. |

## Findings

### Medium — fixed in R1

- **F1 — stale account state after header sign-out on `/sign-in/`**
  - File: `src/components/layout/SignInPanel.tsx:34-52`
  - What: The panel looks up the session only in its mount effect and never listens for
    `SESSION_CHANGE_EVENT`, which `SiteHeader.signOut()` dispatches. After header sign-out the
    header clears but the panel keeps showing `Signed in as <identity>` and the
    `Continue to your lesson` link until a reload.
  - Why: A signed-out visitor sees a signed-in state in the primary form area, contradicting
    FR-2 and the spec edge case. No test covers the authenticated panel state.
  - Fix: In the mount effect, subscribe to `SESSION_CHANGE_EVENT` with a `refresh` callback
    that re-runs `lookupSession()` and clears `identity` (and stale notice) when no user is
    returned; remove the listener on cleanup, mirroring `SiteHeader.tsx`.
  - Requirement: FR-2.
  - Test gap: add an `@onboarding` E2E case that mocks a session with a user, loads
    `/sign-in/`, asserts the panel account block, clicks the header `Sign out`, and asserts the
    form returns.

## Overrides

None.

## Plan compliance

All three phases are marked verified with checkpoints `f2442bb`, `1a2cea9`, `874f4e9` and
linked evidence. All 13 tasks are checked. The doc-only tail is internally consistent.
F1 is fixable and will be handled in a Review Fixes phase rather than deferred.

## Out of scope

Conductor prose, generated files, pre-existing lint warnings, GitHub OAuth (deferred by user),
live credential sign-in (human-only), and production deployment (forbidden by scope guard).

## Debt

None deferred; F1 was fixed in R1 and confirmed by the final re-review.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 1 |

## Doc sync

updated — final verdict PASS, range through `e6d495c`, R1 evidence and integrated checkpoint
`ee3b667` reconciled; product definition and product guidelines required no change.
