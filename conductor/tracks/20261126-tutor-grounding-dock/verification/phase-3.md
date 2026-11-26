# Phase 3 Verification — Sticky dock and mobile bottom sheet

- Track: 20261126-tutor-grounding-dock
- Phase: 3 — Sticky dock and mobile bottom sheet
- Date: 2026-11-26
- Branch: feat/20261126-tutor-grounding-dock
- Base commit: 586dd1a825931c95c2de4fd5fcff61252e39efa0
- Head commit: d60fb4d (implementation head; evidence file left uncommitted for the primary state commit)
- Result: verified

## Task commits

| Task | Commit | Message |
| --- | --- | --- |
| P3.T1 | f4a6948 | feat(tutor): keep dock sticky from 1024px without covering prose |
| P3.T2 | de8da2e | feat(tutor): add collapsible bottom sheet below 1024px |
| P3.T3 | 59da2b4 | feat(tutor): bind context to active focus and scope suggested questions |
| P3.T4 | e2fa36c, d60fb4d | test(tutor): cover sticky dock and mobile sheet across viewports; fix viewport assertions and SSE scope mock |

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Lint | `pnpm lint` | 0 | Passed with 5 pre-existing warnings (no-shadow and prefer-add-event-listener) unrelated to this phase. |
| Format | `pnpm fmt:check` | 0 | 113 files checked, all formatted. |
| Types | `pnpm typecheck` | 0 | `astro sync && tsc --noEmit` passed. |
| Build | `pnpm build` | 0 | Production build passed. |
| Unit | `pnpm test` | 0 | 7 files, 72 tests passed. |
| Coverage | `pnpm coverage` | 0 | Coverage run passed. |
| Integration | `pnpm test:integration` | 0 | Integration suite passed (including retrieval/ingest paths). |
| Smoke | `pnpm smoke` | 0 | 2 smoke tests passed. |
| E2E | `pnpm test:e2e` | 0 | 43 passed, 1 skipped (production Earth, external origin). All new viewport tests passed. Lighthouse budgets met: `/` 1/0.96/1/1, `/lessons/heart/` 1/0.96/0.99/1, `/lessons/earth-interior/` 1/0.96/0.99/1. |

Full verification command, run exactly as specified:

```
pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build && pnpm test && pnpm coverage && pnpm test:integration && pnpm smoke && pnpm test:e2e
```

Final run exited 0. Two earlier runs failed on issues introduced by the new E2E spec (a formatting wrap and an incorrect initial-context assertion) and were fixed before the final run. One earlier Lighthouse run for `/lessons/heart/` failed under CPU contention and passed on automatic retry; no thresholds were changed.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | Question box, focus label and answer stay visible through lesson scroll at desktop widths, without covering prose or hotspots. | `tests/e2e/tutor.spec.ts` sticky-dock tests at 1280×800 and 1024×768 assert the dock is to the right of the prose box and that textarea, context and answer are in viewport after scrolling to the last prose section. CSS fixes the dock from 1024px and reserves a right gutter at 1024–1399px. | Pass |
| AC-5 | Below 1024px the dock collapses behind an "Ask the tutor" control and expands into an Escape-closable bottom sheet with keyboard access to the textarea. | `tests/e2e/tutor.spec.ts` mobile test at 390×844 asserts collapsed control, sheet visibility, textarea focus/in-viewport on open, Escape close with focus returned to the control, and Enter re-open focusing the textarea. Full E2E run passed. | Pass |
| AC-6 | Chips carry explicit hotspot scope, new questions follow the current focus while history is preserved, and citations refocus the cited hotspot. | E2E asserts chip request body contains `activeHotspot: 'aorta'`, context/scope labels update, a later typed question uses the latest focused hotspot with non-empty history, and citation click sets `data-active-hotspot` on the scene island and scrolls the hotspot into view. | Pass |

## Evidence paths

- `src/components/tutor/TutorDock.tsx` — bottom-sheet toggle, focus/Escape handling, always-visible context label, scope label, scoped asks and chip focus binding.
- `src/components/tutor/tutor.css` — 1024px sticky breakpoint, right gutter, mobile bottom sheet, reduced-motion-compatible transitions using existing tokens, scope label styling.
- `src/lib/tutor-client.ts` — `scopeLabel?: string` added to `TutorEvent` (deviation).
- `tests/e2e/tutor.spec.ts` — viewport coverage at 1280×800, 1024×768 and 390×844 plus focus/history/citation assertions.
- `conductor/runs/20261126-tutor-grounding-dock/phase-3-brief.md` — phase contract.

## Deviations

- `src/lib/tutor-client.ts`: added `scopeLabel?: string` to `TutorEvent`. This file is outside the Phase 3 Touches but the smallest necessary change to consume the Phase 2 SSE `scopeLabel` field in the browser; no runtime behaviour changed.

## Notes

- No topic-specific identifiers or prose were added to source; all labels come from MDX data or generic UI copy.
- No new motion tokens, Lighthouse thresholds, configuration, secrets or data were changed.
- Browser verification (visual/screenshots) is handled by the primary agent; this phase adds Playwright viewport coverage only.
- Evidence file intentionally left uncommitted for the primary state commit so the reported head commit remains the implementation head.

## Primary verification

Independent primary re-run of the full phase chain passed on the first attempt (lint with the same six pre-existing warnings, format, typecheck, build, unit, coverage, integration, smoke, E2E 43 passed/1 skipped, all Lighthouse budgets met). `git diff --name-only 586dd1a..HEAD` matched the four reported source/test files plus the deviation in `src/lib/tutor-client.ts`; the deviation diff was exactly the one-line `scopeLabel?: string` addition. Primary in-app browser pass recorded in `verification/browser.md`: sticky dock at 1280×800 and 1024×768 including scroll persistence, chip focus label update, mobile sheet open/Escape close/focus, and the FR-8 graceful fallback when no Worker is present. No new failures or config/threshold changes.
