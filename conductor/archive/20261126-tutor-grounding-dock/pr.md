## Summary

This track makes the tutor answer from the learner's current focus: retrieval is scoped to the active hotspot's MDX-derived chunks, the prompt allowlist and citation gate share that scoped set, and no answer delta streams before citation validation. The dock now stays reachable at all desktop widths from 1024px, collapses into an accessible bottom sheet below that, and updates its grounding context as the learner changes focus.

## Track

- **ID:** `20261126-tutor-grounding-dock`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261126-tutor-grounding-dock/spec.md`](conductor/archive/20261126-tutor-grounding-dock/spec.md)
- **Plan:** [`conductor/archive/20261126-tutor-grounding-dock/plan.md`](conductor/archive/20261126-tutor-grounding-dock/plan.md)
- **Review:** [`conductor/archive/20261126-tutor-grounding-dock/review.md`](conductor/archive/20261126-tutor-grounding-dock/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Generic lesson chunk source | Every authored lesson yields chunks from MDX with no topic constants | verified | `a7ccbb5` | Build-time generator emits `api/src/data/lesson-chunks.ts`; 36 content-derived chunks across both lessons |
| 2: Hotspot-scoped retrieval and citation gate | Answers built only from focused hotspot chunks with explicit fallbacks | verified | `afae0c2` | Scoped retrieval before ranking; shared allowed-ID/citation set; failure paths retain prose excerpt |
| 3: Sticky dock and mobile bottom sheet | Dock reachable at all desktop widths with mobile sheet | verified | `d60fb4d` | One recorded deviation: `src/lib/tutor-client.ts` gains a single `scopeLabel?: string` field to consume the SSE label |
| R1: Review fixes | Resolve Medium finding F1 | verified | `356a252` | Error responses no longer render a "Grounded in ΓÇª" claim; E2E regression test added |

## Requirements

- [x] `FR-1` ΓÇö retrieval uses only the active hotspot's chunks (test: `tests/unit/retrieval.test.ts`, `tests/integration/tutor.test.ts`)
- [x] `FR-2` ΓÇö no focus means lesson-wide retrieval; focused hotspot without chunks returns `no_context` plus static excerpt (test: `tests/integration/tutor.test.ts`)
- [x] `FR-3` ΓÇö citations outside the scoped set are rejected before any delta (test: `tests/unit/prompt.test.ts`, `tests/integration/tutor.test.ts`)
- [x] `FR-4` ΓÇö desktop dock stays in view from 1024px (test: `tests/e2e/tutor.spec.ts`, browser evidence)
- [x] `FR-5` ΓÇö below 1024px collapsed Ask control opens a bottom sheet with Escape close (test: `tests/e2e/tutor.spec.ts`, browser evidence)
- [x] `FR-6` ΓÇö focus changes update the label and re-scope the next question, preserving history (test: `tests/e2e/tutor.spec.ts`)
- [x] `FR-7` ΓÇö chunks come from authored lesson MDX for every lesson, topic-agnostic (test: `tests/unit/retrieval.test.ts`)
- [x] `FR-8` ΓÇö quota/off-topic/no-context/invalid-citation/unavailable paths keep prose usable (test: `tests/integration/tutor.test.ts`, `tests/e2e/tutor.spec.ts`)
- [x] `FR-9` ΓÇö suggested chips carry explicit hotspot scope (test: `tests/e2e/tutor.spec.ts`)
- [x] `NFR-1` ΓÇö no new secrets, deploy config, production data or threshold changes
- [x] `NFR-2` ΓÇö keyboard reachable, visible focus, `aria-live` answers, sheet focus management (test: `tests/e2e/tutor.spec.ts`, browser evidence)
- [x] `NFR-3` ΓÇö reduced motion respected, existing tokens reused
- [x] `NFR-4` ΓÇö deterministic mocked-LLM tests; lexical embedding fallback (test: `tests/unit/retrieval.test.ts`)
- [x] `NFR-5` ΓÇö Lighthouse budgets unchanged; dock remains a small React island
- [x] `NFR-6` ΓÇö no topic-specific identifiers in the generic chunk path
- [x] `AC-1` ΓÇö `activeHotspot='aorta'` returns only aorta chunks
- [x] `AC-2` ΓÇö null hotspot yields lesson-wide chunks; unknown hotspot yields `no_context` plus excerpt
- [x] `AC-3` ΓÇö mocked cross-hotspot citation yields `invalid_citation` with zero deltas
- [x] `AC-4` ΓÇö 1280├ù800 and 1024├ù768 keep question box, focus label and answer in viewport after scroll
- [x] `AC-5` ΓÇö 390├ù844 collapsed dock opens sheet, Escape closes, keyboard reaches textarea
- [x] `AC-6` ΓÇö chip selection sends the hotspot and citation refocuses it
- [x] `AC-7` ΓÇö every authored lesson yields non-empty content-derived chunks
- [x] `AC-8` ΓÇö failure paths return error plus excerpt with prose rendered
- [x] `AC-9` ΓÇö `pnpm verify`, `pnpm test`, `pnpm typecheck`, `pnpm build` pass and browser pass at review and after every fix round

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static + unit + coverage + integration + build | `pnpm verify` | pass | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| smoke | `pnpm smoke` | pass (2) | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| e2e + Lighthouse | `pnpm test:e2e` | pass (44 passed, 1 skipped external-origin test; budgets met) | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| unit | `pnpm test` | pass (22 files / 221 tests) | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| coverage | `pnpm coverage` | pass (80% gate met) | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| integration | `pnpm test:integration` | pass (7 files / 72 tests) | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| typecheck | `pnpm typecheck` | pass | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| build | `pnpm build` | pass (5 pages) | `conductor/archive/20261126-tutor-grounding-dock/verification/integrated.md` |
| in-app browser | primary pass | pass | `conductor/archive/20261126-tutor-grounding-dock/verification/browser.md` |

Combined final command: `pnpm verify && pnpm smoke && pnpm test:e2e` (exit 0). The known `oxfmt` exit-5 flake was confirmed with a direct `pnpm exec oxfmt --check .` and the chain rerun; no threshold or config changed.

## Media

![Sticky tutor dock on the heart lesson](https://github.com/user-attachments/assets/39b94d27-1c5a-4017-a61c-9fdab4e5b5e1)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 1 finding (F1, Medium: grounding label shown on error responses)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- `src/lib/tutor-client.ts` adds one optional `scopeLabel?: string` field to `TutorEvent` so the browser can render the Phase 2 SSE grounding label. Minimal and necessary; no client behavior change beyond display.
- Static Astro dev has no Worker, so local browser checks observed the documented FR-8 fallback rather than a live LLM answer. Live credential sign-in and production verification were out of scope.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```

No migrations, feature flags or data resets are required; reverting the merge restores the previous retrieval and dock implementation.

