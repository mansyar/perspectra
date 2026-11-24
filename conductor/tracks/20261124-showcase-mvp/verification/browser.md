# Browser Verification — 20261124-showcase-mvp

Track: `20261124-showcase-mvp`
Branch: `feat/20261124-showcase-mvp`
Tool: in-app browser skill against `pnpm preview --host 127.0.0.1 --port 4321`
Viewport: ~1200 × 800 CSS pixels

A static `astro preview` has no Worker behind `/api/*`; 404s for `/api/mastery`, `/api/progress` and `/api/tutor` are expected and are not counted as defects. Screenshots were captured for inspection but are not committed.

## Review gate — 2026-11-24 (initial)

- `/` — catalog rendered correctly with title, lesson card and no unexpected console errors.
- `/lessons/heart/` — poster, prose, tutor dock, quiz and mastery surfaces rendered. After clicking **Start interactive 3D view**, the WebGPU canvas showed grossly oversized, cropped geometry and hotspot anchors did not match the model centres.
- Verdict: **FAIL** → recorded as F6 (Medium) and fixed in review round 1.

## Review-fix round 1 — after F6

- `/lessons/heart/` — model was correctly framed after clicking Start, but rendered as one cyan chamber and several near-black shapes. GLB material factors were verified correct, so the cause was missing canvas lights.
- Verdict: **FAIL** → recorded as F7 (High) and fixed in review round 1.

## Review-fix round 1 — after F7 (final)

- `/` — catalog still renders correctly; no unexpected console errors.
- `/lessons/heart/` — after clicking Start, `data-renderer="webgpu"` and `data-scene-ready="true"`. The whole heart is framed with margin and shows the authored red myocardium, red oxygenated artery, blue deoxygenated artery, purple right ventricle and tan valve tissue. The active `left_ventricle` mesh has a subtle pale highlight that accents rather than replaces its base colour. Hotspot buttons remain visible below the canvas.
- `/lessons/heart/?rendererErrors=1` — after one forced WebGPU failure, the scene remounted with `data-renderer="webgl"`, displayed the `webgpu rendering failed. Retrying with webgl.` status, and rendered the same framed and lit model. The poster fallback button was present.
- `/verify/` — public verifier page loads.
- Console: only the expected static-preview `/api/*` 404s; no uncaught exceptions or rendering errors.
- Verdict: **PASS**. F6 and F7 are resolved on both WebGPU and WebGL tiers.
