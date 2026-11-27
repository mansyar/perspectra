# Primary browser verification — 20261127-scene-stage-reframing

- Track: `20261127-scene-stage-reframing`
- Branch: `feat/20261127-scene-stage-reframing`
- Phase: 3 (review pass to be appended here after any fix rounds)
- Date: 2026-11-27
- Result: pass
- Method: primary Playwright Chromium against `astro preview` on `http://127.0.0.1:4322`. The in-app browser namespace was unavailable in this runtime; no in-app pass is claimed.

## Phase 3 pass

The primary script exercised both authored lessons in WebGL after explicit opt-in. Every check waited for hydration/readiness before measuring or interacting.

| Lesson | Viewport | Renderer | Focus clip | Canvas bounds | Replay | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Heart | 1280×800 | WebGL | `pulmonary_flow` | x=193, y=313.84, 550×412.5 | run 2 → 6 | pass |
| Earth Interior | 1280×800 | WebGL | `outer_core_convection` | x=193, y=342.64, 550×412.5 | run 2 → 4 | pass |
| Heart | 1024×768 | WebGL | `pulmonary_flow` | x=65, y=313.84, 550×412.5 | run 2 → 5 | pass |
| Earth Interior | 1024×768 | WebGL | `outer_core_convection` | x=65, y=342.64, 550×412.5 | run 2 → 5 | pass |
| Heart | 390×844 | WebGL | `pulmonary_flow` | x=17, y=342.64, 356×356 | run 2 → 6 | pass |
| Earth Interior | 390×844 | WebGL | `outer_core_convection` | x=17, y=342.64, 356×356 | run 2 → 4 | pass |
| Heart | 390×844, reduced motion | WebGL | none | static | run 0 | pass |
| Earth Interior | 390×844, reduced motion | WebGL | none | static | run 0 | pass |

Observed behavior:

- Poster remained visible and the canvas was absent before the learner opted in.
- Guidance rendered: “Select a landmark below, or a highlighted structure in the model, to focus the scene. Scroll the lesson text to read about each landmark.” No drag/orbit/pinch/rotate/zoom instruction appeared.
- Canvas bounds stayed inside each viewport horizontally; mobile used a square 356×356 stage.
- Selecting `pulmonary_artery` played `pulmonary_flow`; selecting `outer_core` played `outer_core_convection`. Leaving and returning to the same hotspot replayed the same clip and incremented `data-animation-run`.
- Reduced motion exposed `data-motion="reduced"`, left `data-animation-run="0"`, and kept `data-animation-clip` empty.
- No page errors occurred in any check.
- Focused screenshots at desktop and mobile widths were visually inspected. Heart and Earth were centered and unclipped; controls and guidance remained visible below the model.

Private artifacts (gitignored):

- `.conductor/evidence/phase-3-browser.mjs`
- `.conductor/evidence/phase-3-browser.json`
- `.conductor/media/20261127-scene-stage-reframing/*-{1280,1024,390}-{poster,focused}.png`

Requirement coverage: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6; FR-1, FR-2, FR-3, FR-4, FR-7, FR-8; NFR-2, NFR-3.
