# Earth Interior Asset Contract

Source of truth: `build_earth.py` (Blender 5.2, deterministic procedural geometry).

- Renderer input: plain glTF 2.0 `earth.glb`, Y-up, no cameras or lights.
- Runtime model: `/assets/earth-interior/earth.glb`.
- Runtime poster: `/assets/earth-interior/earth-poster.webp`.
- Poster source: `public/assets/earth-interior/earth-poster.png` (960×960).
- Budgets: GLB < 1,000,000 bytes; WebP < 120,000 bytes.
- Style: detailed semi-realistic cutaway with smooth vertex-coloured continents,
  visible strata, distinct mantle/core materials, and a warm emissive core.
- Six named one-shot animations, each driven by exactly one hotspot trigger:
  `CrustShift`, `UpperMantleFlow`, `LowerMantleFlow`, `OuterCoreConvection`,
  `InnerCorePulse`, `LithosphereDrift`. The renderer must play them only on
  trigger, never as an ambient loop. No Earth-specific TypeScript or geometry
  logic is required.

## Hotspot nodes

The GLB contains exactly these mesh-node names, matching MDX hotspot IDs:

| ID | glTF anchor |
| --- | --- |
| `crust` | `[-0.55, 0.88, 0.72]` |
| `upper_mantle` | `[0.72, 0.42, 0.62]` |
| `lower_mantle` | `[-0.52, -0.42, 0.54]` |
| `outer_core` | `[0.16, 0.02, 0.24]` |
| `inner_core` | `[0.0, 0.0, 0.14]` |
| `lithosphere` | `[-0.82, 0.58, 0.56]` |

The MDX camera is `[4.2, 1.6, 3.6]`, target `[0, -0.1, 0]`, FOV 38°. It matches
the poster camera after Blender Z-up to glTF Y-up conversion (lens 52.3 mm).

## Portability

Only this recipe uses Blender. The application depends on the GLB, WebP, manifest,
and named-node contract. Freezing the GLB/WebP requires no app changes; rebuilding
with another tool requires only preserving the same six IDs and coordinate contract.
