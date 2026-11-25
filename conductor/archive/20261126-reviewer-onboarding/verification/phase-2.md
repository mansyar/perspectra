# Phase 2 verification — Inline CTAs & Trust Copy

- Track: `20261126-reviewer-onboarding`
- Phase: 2 — Inline CTAs & Trust Copy
- Date: 2026-11-26
- Branch: `feat/20261126-reviewer-onboarding`
- Base: `8924e943bf13a4629ad528a5a982091c080fa9db`
- Head at verification: `84ace668cd9fff6529af28f06781e5f70db05142`
- Result: **verified** — `pnpm verify` exited `0`.

## Verification command

| Command | Exit code | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | All chained checks passed. |

Exact command run: `pnpm verify` (expands to `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm test && pnpm coverage && pnpm test:integration && pnpm build`).

Command summaries from the authoritative passing run:

- `pnpm lint` (`oxlint .`): 0 errors, 5 pre-existing warnings in `src/lib/offline-queue.ts` and `tests/integration/worker-assets.test.ts`; none in Phase 2 files.
- `pnpm fmt:check`: “All matched files use the correct format.”
- `pnpm typecheck` (`astro sync && tsc --noEmit`): clean; includes the new React CTA markup and the added E2E specs.
- `pnpm test`: 22 files, 214 tests passed (was 208; 6 new `signInHref` tests).
- `pnpm coverage`: 98.63% statements, 92.89% branches, 97.89% functions, 99.13% lines; all per-file 80% gates pass. Thresholds unchanged.
- `pnpm test:integration`: 7 files, 66 tests passed.
- `pnpm build` (`astro build`): 5 static pages; only the pre-existing >500 kB chunk advisory from Vite.

The known `oxfmt` exit-5-with-correct-output flake occurred on an isolated `pnpm fmt:check` run; the exact command was rerun once and passed. A genuine format issue in the new E2E spec was corrected with the configured `pnpm fmt` command; no config, lockfile, or generated file was changed to make a check pass.

## Acceptance criteria mapping (Phase 2 scope)

| ID | Criterion | Evidence in this phase | Status |
| --- | --- | --- | --- |
| AC-4 | Anonymous mastery and quiz panels show auth CTAs with the current lesson return URL. | `MasteryPanel` and `QuizPanel` render `data-auth-cta="mastery"` / `"quiz"` anchors inside the existing `role="status"` region on HTTP 401, using `signInHref('/lessons/${lessonId}/')`. The 401 status lines remain short; cells, 20% placeholders, summary, generate button, question flow, `data-quiz-hydrated`, and test IDs are unchanged. `@onboarding` E2E spec mocks 401 for mastery, quiz generate, and quiz grade and asserts the encoded href `/sign-in?next=%2Flessons%2Fheart%2F` plus keyboard focus. | Implemented; browser pass pending (Phase 3) |
| AC-5 | `/verify/` contains no "static preview" wording and the sample button uses shared tokens. | `verify.astro` fixture copy is environment-neutral and contains no "Static preview has no Worker API"; fixture secret, issue/verify logic, title, status text, and `data-*` attributes are untouched. `.verify-fixture__button` uses `--border`, `--accent`, `--focus`, `--space`-compatible padding, transparent background, and a 2.75rem minimum height. `@onboarding` E2E asserts the secondary class hook and transparent background. | Implemented; browser pass pending (Phase 3) |
| AC-6 | Coming-soon labels are visibly separated on desktop and mobile. | `.lesson-card__badge` is `display: block` with `margin-bottom: var(--space-sm)`; hero copy, card order, and topics unchanged. `@onboarding` E2E asserts computed display/margin and positive vertical gap at desktop width and 360px. | Implemented; browser pass pending (Phase 3) |
| NFR-2 | WCAG 2.2 AA, keyboard focus, reduced-motion intact. | Auth CTAs are real anchors in the status region with `--focus` focus-visible outlines; the fixture button keeps a visible `--focus` ring and adequate tap size. No reduced-motion or global focus rule was changed. | Implemented; visual pass pending (Phase 3) |
| NFR-5 | Responsive at 360px and wider. | Badge spacing uses a space token rather than fixed pixels; E2E checks the separation at 360px. | Implemented; visual pass pending (Phase 3) |
| FR-4, FR-5, FR-6 | Requirements behind AC-4, AC-5, AC-6. | Covered by the same implementation and tests above. | Implemented |

AC-1 through AC-3 and AC-7, AC-8 remain Phase 1 / Phase 3 scope respectively.

## Unit evidence for `signInHref`

`tests/unit/auth-navigation.test.ts` adds pure tests for: root lesson path, query/hash preservation, reserved-character encoding, and empty/undefined/null fallback to `/sign-in`.

## Evidence paths

- `src/lib/auth-navigation.ts` (`signInHref`)
- `src/components/mastery/MasteryPanel.tsx`, `src/components/mastery/mastery.css`
- `src/components/quiz/QuizPanel.tsx`, `src/components/quiz/quiz.css`
- `src/pages/verify.astro`
- `src/styles/global.css`
- `tests/unit/auth-navigation.test.ts`
- `tests/e2e/onboarding.spec.ts`

## Deviations

None. All changes stayed inside the brief's `Touches`. No dependency, config, lockfile, generated file, Conductor state file, `.opencode/agents/**` file, or deployed resource was modified.

## Notes for primary

- E2E specs were written and typechecked but not executed by this phase; Playwright browser execution and Lighthouse remain primary-owned Phase 3 gates.
- Static preview has no Worker, so `/api/*` 404s remain expected; the new mocked-401 spec explicitly stubs mastery/quiz to 401 to prove the CTA appears.
- Task commits (oldest to newest): `6acefd1`, `7c4f58b`, `a8516c3`, `1bf9d9e`, `84ace66`.

## Primary verification

| Check | Result |
| --- | --- |
| Working tree before verification | clean |
| `git diff --name-only 8924e943bf13a4629ad528a5a982091c080fa9db..HEAD` | only the 10 declared Phase 2 files |
| `pnpm verify` | exit `0` |
| `pnpm lint` | 5 pre-existing warnings, 0 errors; none in Phase 2 files |
| `pnpm fmt:check` | clean on the final tree after one permitted flake rerun |
| `pnpm typecheck` | clean |
| `pnpm test` | 22 unit files, 214 tests passed |
| `pnpm coverage` | 98.63% statements, 92.89% branches, 97.89% functions, 99.13% lines; all per-file 80% gates pass |
| `pnpm test:integration` | 7 files, 66 tests passed |
| `pnpm build` | 5 static pages |

Result remains VERIFIED for Phase 2. Browser execution, production proof, and Lighthouse remain primary-owned Phase 3 gates. Full primary log: `C:\Users\Ansyar\AppData\Local\Temp\opencode\verify-phase2.log`.

