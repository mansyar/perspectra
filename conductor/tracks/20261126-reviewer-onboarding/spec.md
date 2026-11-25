# Reviewer Onboarding & Trust — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add discoverable global navigation and sign-in, a dedicated sign-in page, inline
auth calls to action in mastery and quiz, production-accurate verifier copy, and
corrected catalog coming-soon labels so a reviewer can complete the authenticated
learning loop without dead ends.

## Problem / Motivation

The catalog, lesson, and verifier pages have no visible sign-in control. Mastery
and quiz panels tell anonymous visitors to sign in but offer no path to do so.
The public verifier still says it is a static preview, and catalog coming-soon
labels render as `COMING SOONRESPIRATORY` with no separation. Reviewers cannot
reach the authenticated tutor/quiz/mastery/badge experience without guessing,
and the product appears unfinished even though the backend works.

## Goals & Success Metrics

- **Goal:** A reviewer can find and use sign-in from any public page within two
  clicks and return to the originating lesson.
- **Metric:** Browser evidence on catalog, lesson, `/sign-in`, and `/verify/`;
  all Lighthouse budgets unchanged; no unexpected console errors.

## Scope

### In Scope

- Global header with wordmark, Lessons, Verify, and Sign in/account state.
- Dedicated `/sign-in` page using existing Better Auth email/password and Google
  endpoints, with a same-origin `next` return URL.
- Anonymous mastery and quiz auth CTAs linking to `/sign-in?next=<lesson URL>`.
- Minimal signed-in account state and sign-out action.
- Production-accurate verifier copy and shared-token styling for the sample
  credential button.
- Visible separation in catalog coming-soon labels on desktop and mobile.
- Unit, E2E, browser, and integrated evidence.

### Out of Scope

- Tutor sticky dock and grounding reliability (RM-9).
- 3D stage reframing, model scale, and motion changes (RM-10).
- Catalog thumbnails and neutral hero copy (RM-11).
- Persistent reading navigation and anonymous mastery clarity (RM-12).
- GitHub OAuth (explicitly deferred by the user).
- New lessons/topics, custom domain, automatic deployment, committed secrets,
  and destructive production data changes.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Global header is present on catalog, lesson, verify, and sign-in pages with wordmark, Lessons, Verify, and Sign in/account state. | must |
| FR-2 | Dedicated `/sign-in` page provides email/password sign-in and sign-up plus a Google button through existing Better Auth endpoints; signed-in visitors see minimal account state and sign-out. | must |
| FR-3 | `next` return URL is validated to the same origin and used after successful sign-in; invalid values fall back to `/`. | must |
| FR-4 | Anonymous mastery and quiz panels show an inline auth CTA linking to `/sign-in?next=<current lesson URL>`. | must |
| FR-5 | `/verify/` uses production-accurate copy with no "static preview" wording, and the sample credential button uses shared design tokens. | must |
| FR-6 | Catalog coming-soon labels have visible separation between `COMING SOON` and the subject name on desktop and mobile. | must |
| FR-7 | Browser verification evidence is recorded for catalog, lesson, `/sign-in`, and `/verify`. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Lighthouse performance/accessibility ≥0.95 and best-practices/SEO ≥0.90 remain unchanged; catalog remains zero-JS. |
| NFR-2 | WCAG 2.2 AA, keyboard focus, and reduced-motion behavior remain intact. |
| NFR-3 | No new dependencies, secrets, or production credentials; reuse existing Better Auth endpoints and configuration. |
| NFR-4 | Topic-neutral implementation with no Earth/heart-specific runtime logic. |
| NFR-5 | Responsive at 360px and wider. |
| NFR-6 | No production data reset, deployment change, custom domain, or auto-deploy. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Header renders four controls on all public pages; catalog still has zero `<script>` tags. | FR-1, NFR-1 |
| AC-2 | Unauthenticated visitor clicking Sign in reaches `/sign-in`; email/password fields and Google button are present; no secret values appear in the DOM. | FR-2, NFR-3 |
| AC-3 | A valid same-origin `next` value is preserved and used after sign-in; a foreign URL falls back to `/`. | FR-3 |
| AC-4 | Anonymous mastery and quiz panels show auth CTAs with the current lesson return URL. | FR-4 |
| AC-5 | `/verify/` contains no "static preview" wording and the sample button uses shared tokens. | FR-5 |
| AC-6 | Coming-soon labels are visibly separated on desktop and mobile. | FR-6, NFR-5 |
| AC-7 | `pnpm verify:full` exits 0 with unchanged thresholds; browser evidence passes with no unexpected console errors. | FR-7, NFR-1, NFR-2 |
| AC-8 | No topic-specific runtime logic, new dependencies, secrets, or production changes. | NFR-3, NFR-4, NFR-6 |

## Edge Cases

- Authenticated visitor sees account/sign-out state instead of Sign in.
- Invalid or foreign `next` URL falls back to `/`.
- Duplicate-email sign-up shows inline feedback instead of a broken page.
- Static preview without a Worker API shows a graceful sign-in fallback message.
- Mobile header does not overflow at 360px.
- Google sign-in remains available in production; GitHub is not shown.

## Dependencies

- **Tracks:** none — public deployment and Earth interior proof are complete.
- **External:** existing production Better Auth configuration, Google OAuth, and
  email/password support; no new credentials are introduced by this track.

## Open Questions & Assumptions

- **Assumption:** GitHub OAuth remains explicitly deferred.
- **Assumption:** Account state is minimal (signed-in indicator and sign-out),
  with no full profile page.
- **Assumption:** Return URL uses a `next` query parameter validated to the
  current origin.
- **Assumption:** Existing accent color, font pairing, and motion language stay
  unchanged.

## References

- Production UI/UX critique from 2026-11-26 browser review.
- Production origin: `https://perspectra-api.m-ansyarafi.workers.dev`.
- `conductor/product-guidelines.md` for voice, accessibility, and trust.
- `conductor/roadmap.md` items RM-7 and RM-8.
