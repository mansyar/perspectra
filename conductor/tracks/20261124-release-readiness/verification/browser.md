# Browser verification log

This file records in-app browser passes that phase subagents cannot perform. Each phase adds its own
section; the primary completes the pass before accepting that phase.

## Phase 4

Status: **PASS**

Scope: FR-7, FR-8, AC-9 (generic non-heart badge narrative on the verifier page).

### Setup

- `pnpm verify:full` has passed; `dist/` exists from the build step.
- Start `pnpm preview --host 127.0.0.1 --port 4321` and open `http://127.0.0.1:4321/verify/`.
- The static preview has no Worker: any `POST /api/badge/verify` made by the real verify form will
  return a 404 (or be reported as unavailable by the page). These `/api/*` 404s are **expected** in
  static preview and must be disclosed, not treated as a console regression.
- The page includes a public, clearly labelled offline fixture button (`Show brain sample narrative`).
  It renders a pre-signed `brain` sample with two hotspots (`cortex`, `hippocampus`) for prose review
  only; it is explicitly not signature verification and uses no deployment secret.

### Checks to complete

1. Click `Show brain sample narrative`.
2. Assert the details panel shows:
   - Achievement: `brain mastery`
   - Narrative: contains `brain`, `2 hotspots`, `cortex`, and `hippocampus`;
     contains neither `heart` nor `six landmarks`.
   - Issuer: `Perspectra`; Issued: `2026-11-24T00:00:00.000Z`.
   - Status: `Sample credential (offline fixture, not signature-verified)`; no `data-valid="true"`
     marker on the status element (sample prose is not presented as a verified credential).
3. Confirm no unexpected console errors or page exceptions. Record any expected `/api/*` 404s
   observed while loading `/verify/` or submitting a credential, with their URLs.
4. Optionally submit a deliberately invalid credential to confirm the existing invalid/unavailable
   message still appears and the details panel is hidden.

### Primary result (to be filled by primary)

- Browser/tool and URL: in-app browser, `http://127.0.0.1:4321/verify/` on `pnpm preview` (tab `tab_1e899f12-cfbc-46ad-93af-5d9b21cdfa9c`).
- Observed narrative text: `Mastered all 2 hotspots (cortex, hippocampus) of the brain lesson with mastery at or above 0.85.` Achievement `brain mastery`, issuer `Perspectra`, issued `2026-11-24T00:00:00.000Z`, status `Sample credential (offline fixture, not signature-verified)` with no `data-valid="true"` marker. The narrative contains `brain`, `2 hotspots`, `cortex`, and `hippocampus`, and contains neither `heart` nor `six landmarks`.
- Console errors: none; `console({ level: "error" })` returned zero messages. No `/api/*` request was made by loading the page or clicking the offline fixture, so no expected 404 needed disclosure.
- Verdict: **PASS** — AC-9 satisfied; no visual, prose, or console regression.
