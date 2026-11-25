# Browser verification — Reviewer Onboarding & Trust

- Track: `20261126-reviewer-onboarding`
- Date: 2026-11-26
- Origin: local preview `http://127.0.0.1:4321` (served from `dist/` built by `pnpm verify:full`)
- Tool: in-app browser (paired Chrome) plus Playwright for the 360px coming-soon assertion already recorded in `integrated.md`
- Result: **PASS** — no unexpected console errors; static-preview `/api/*` 404s are expected

## Surfaces inspected

### Catalog `/`

- Title: `Perspectra — Explore subjects in 3D`; heading: `Explore complex ideas in 3D`.
- Header controls: wordmark `Perspectra` (`/`), `Lessons` (`/`, `aria-current="page"`), `Verify` (`/verify`), `Sign in` (`/sign-in`).
- `document.querySelectorAll('script').length === 0` — catalog remains zero-JS.
- Coming-soon badges render separated text: `COMING SOON RESPIRATORY`, `COMING SOON RENAL`, `COMING SOON NERVOUS`. Computed badge style: `display: block`, `margin-bottom: 8px`.
- Console errors: none.

### Lesson `/lessons/heart/`

- Header controls match catalog; Sign in link resolves to `/sign-in?next=%2Flessons%2Fheart%2F`.
- Mastery panel: no auth CTA in static preview because `/api/mastery?lessonId=heart` returns 404; it shows the graceful message `Mastery is unavailable right now. The lesson prose is still available.` The mocked-401 CTA behavior is covered by the `@onboarding` Playwright spec.
- Console errors: expected `/api/auth/get-session` and `/api/mastery?lessonId=heart` 404s only.

### Sign-in `/sign-in/`

- Heading: `Sign in to Perspectra`.
- Email, password, and name inputs present; actions `Sign in`, `Create account`, `Continue with Google`.
- Trust text: `Use your email address or Google account to continue. GitHub sign-in is not offered yet.`
- No secret-looking values or tokens in the DOM.
- Console errors: expected `/api/auth/get-session` 404 only.

### Verifier `/verify/`

- No `Static preview has no Worker API` wording.
- Fixture button uses the shared `verify-fixture__button` class with transparent background and accent color/border; fixture parsing/status attributes unchanged.
- Header Sign in link resolves to `/sign-in?next=%2Fverify%2F`.
- Status text: `No credential was supplied.`
- Console errors: expected `/api/auth/get-session` 404 only.

## Scope note

The public workers.dev origin was not redeployed by this track; NFR-6 forbids deployment changes. This pass validates the built artifact locally. Real Google/email sign-in against the live origin remains a human-only production check and is not claimed here.

## Verdict

**PASS.** AC-1, AC-2, AC-4, AC-5, AC-6 and AC-7 are supported by the visual pass; expected static-preview 404s are documented and no unexpected error was observed.
