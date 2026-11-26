# Implement a sticky tutor dock with reliable hotspot-grounded answers — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Keep the course tutor visible and answer only from the lesson material at the learner's current point of focus, for every authored lesson, without changing the topic-agnostic content model.

## Problem / Motivation

The 2026-11-26 critique rated UX 6/10: answers drift to the wrong hotspot because retrieval searches the whole lesson while the active hotspot is only a prompt label, and the dock disappears at common laptop widths because it is fixed only at ≥1400px. A reviewer exploring the lesson cannot tell what an answer is grounded in, undermining the product's central promise of a course-grounded tutor.

## Goals & Success Metrics

- **Goal:** every answer is traceable to the hotspot the learner is looking at, and the question box is always reachable.
- **Metric:** 100% of tests answer with citations only from the active hotspot; browser checks pass at 1280px, 1024px and 390px; zero cross-focus citations in integration tests.

## Scope

### In Scope

- Hotspot-scoped retrieval with explicit no-answer fallback.
- Citation gate aligned to the scoped chunk set; no cross-hotspot answers.
- Sticky desktop dock and collapsible mobile bottom sheet.
- Focus changes update displayed context and re-scope subsequent turns while keeping history.
- Generic, MDX-derived chunk source for all authored lessons.

### Out of Scope

- New lessons, topics, or content authoring changes beyond the chunk source.
- Live credential sign-in, deploy, custom domain, data resets, config or Lighthouse threshold changes.
- New animation tokens, avatar tutor, general chatbot.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | When `activeHotspot` is present and valid, retrieval uses only that hotspot's chunks. | must |
| FR-2 | When no hotspot is selected, retrieval uses the whole lesson and the dock says so; when a selected hotspot has no matching chunks, the tutor returns `no_context` with the static excerpt. | must |
| FR-3 | Citation validation rejects any answer citing a chunk outside the scoped set; no answer deltas stream before validation. | must |
| FR-4 | On desktop ≥1024px, the dock stays in the viewport for the whole lesson with question box, focus label and answer visible. | must |
| FR-5 | Below 1024px, the dock is collapsed behind an "Ask the tutor" control and expands to a bottom sheet with the same controls and Escape-to-close. | must |
| FR-6 | Focusing a hotspot updates the dock's context label and scopes the next question to it while preserving history. | must |
| FR-7 | Chunks come from authored lesson MDX for every lesson, with hotspot IDs and text supplied by content, not topic-specific code. | must |
| FR-8 | Quota, off-topic, no-context, invalid-citation and unavailable paths keep prose usable and show the existing error + static excerpt. | must |
| FR-9 | Suggested-chip questions carry an explicit hotspot scope so prose scrolling cannot retarget them. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new secrets, deploy configuration, production data changes or threshold changes. |
| NFR-2 | Keyboard reachable, visible focus, `aria-live` answers; bottom sheet manages focus and closes on Escape. |
| NFR-3 | Respect `prefers-reduced-motion`; reuse existing motion tokens. |
| NFR-4 | Retrieval and citation gate test deterministically with a mocked LLM; embedding failure still degrades to lexical ranking. |
| NFR-5 | Lighthouse budgets and retry policy unchanged; the dock stays a small React island. |
| NFR-6 | No `heart`/`earth` or topic identifiers in code paths; content supplies them. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Unit: with `activeHotspot='aorta'`, retrieval returns only `aorta` chunks. | FR-1 |
| AC-2 | Unit: null hotspot yields lesson-wide chunks; unknown hotspot yields `no_context` + static excerpt. | FR-2 |
| AC-3 | Integration: mocked LLM citing another hotspot's chunk yields `invalid_citation` and zero deltas. | FR-3 |
| AC-4 | Browser at 1280×800 and 1024×768: after scrolling to the last prose section the textarea, focus label and answer remain in viewport. | FR-4 |
| AC-5 | Browser at 390×844: dock collapsed initially; Ask opens a bottom sheet; Escape closes it; keyboard reaches the textarea. | FR-5 |
| AC-6 | Browser: selecting a focus chip sends that hotspot in the request and its citation button refocuses the same hotspot. | FR-6, FR-9 |
| AC-7 | Unit: chunk source returns non-empty chunks for each authored lesson, IDs derived from MDX, no topic constants. | FR-7 |
| AC-8 | Integration: quota denial, unavailable LLM and no-context paths return an error event plus static excerpt with prose still rendered. | FR-8 |
| AC-9 | `pnpm verify`, `pnpm test`, `pnpm typecheck`, `pnpm build` pass; browser pass performed at review and after each fix round. | NFR-1, NFR-4, NFR-5 |

## Edge Cases

- No hotspot selected on poster/first load; invalid hotspot ID in request; hotspot with no prose chunks.
- Question explicitly about a different hotspot while one is focused; ambiguous question spanning two hotspots.
- Long question, streamed answer interrupted, network failure mid-stream.
- Offline / no-JS: static MDX prose must remain fully readable.
- Reduced motion on; focus change while the mobile sheet is open.

## Dependencies

- **Tracks:** none
- **External:** existing Gemini LLM/embeddings via configured Worker (mocked in tests), MDX content collection, Workers KV quota. No new credentials or services.

## Open Questions & Assumptions

- **Assumption:** no active hotspot (poster/open-access view) means whole-lesson retrieval; a selected hotspot with no chunks means an explicit no-answer.
- **Assumption:** "all authored lessons" means the lessons currently in the content collection; no new topics are authored here.
- **Assumption:** desktop threshold is 1024px; below it the bottom-sheet model applies.
- **Assumption:** verification is local with mocked services; no live production session, deploy, or data reset.

## References

- 2026-11-26 UI/UX critique (session notes; UX 6/10, wrong-context and weak-grounding findings).
- [Product definition](../../product.md), [Product guidelines](../../product-guidelines.md), [Architecture](../../../docs/ARCHITECTURE.md).
- Archived reviewer-onboarding spec and review; roadmap item RM-9.
