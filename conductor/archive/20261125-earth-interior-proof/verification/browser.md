# Browser Verification — Earth Interior Topic Proof

- **Track:** `20261125-earth-interior-proof`
- **Origin:** `https://perspectra-api.m-ansyarafi.workers.dev`
- **Date:** 2026-11-25
- **Browser:** paired Chrome via in-app browse tools, production tab `1990715899`

## Production Earth lesson — WebGPU

Navigated to `/lessons/earth-interior/` (HTTP 200, title `Inside Earth — Perspectra`). The catalog/prose, six landmark buttons, tutor disclosure, mastery panel, and quiz controls rendered. Clicking `Start interactive 3D view` produced:

```json
{"active":"crust","buttons":6,"canvas":true,"posterHidden":true,"ready":"true","renderer":"webgpu"}
```

A screenshot showed the complete, framed, correctly lit semi-realistic procedural cutaway: blue/green surface, distinct tan/brown mantle strata, red outer core, and warm pale inner core. Clicking the `Outer core` landmark changed `data-active-hotspot` to `outer_core` while keeping the renderer ready. Console error entries were empty on the normal path.

## Forced WebGL step-down

Navigated to `/lessons/earth-interior/?rendererErrors=1`, started the scene, and observed:

```json
{"active":"crust","canvas":true,"posterHidden":true,"ready":"true","renderer":"webgl","status":"webgpu rendering failed. Retrying with webgl.Use the illustrated poster"}
```

The WebGL scene preserved framing and materials. Console contained the intentional `Forced renderer failure (QA hook)` error and React Three Fiber alpha informational logs; no unexpected production error.

## Forced poster fallback

Navigated to `/lessons/earth-interior/?rendererErrors=2`, started the scene, and observed:

```json
{"canvas":false,"posterSrc":"/assets/earth-interior/earth-poster.webp","posterVisible":true,"proseHeadings":6,"ready":"false","renderer":"poster","status":"Interactive 3D is unavailable. The complete lesson text remains below."}
```

The complete WebP poster and all six prose sections remained usable. This satisfies NFR-3 graceful degradation on the public origin.

## Result

**PASS** — production visual, interaction, and fallback paths for the second topic are correct. Screenshots were captured through the in-app browser but are not committed as evidence binaries.
