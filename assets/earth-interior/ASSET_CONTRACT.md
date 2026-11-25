# Earth Interior Asset Contract

Source of truth: `build_earth.py` (Blender 5.2, deterministic procedural geometry).

- Renderer input: plain glTF 2.0 `earth.glb`, Y-up, no cameras or lights.
- Runtime model: `/assets/earth-interior/earth.glb`.
- Runtime poster: `/assets/earth-interior/earth-poster.webp`.
- Poster source: `public/assets/earth-interior/earth-poster.png` (960×960).
- Budgets: GLB < 1,000,000 bytes; WebP < 120,000 bytes.
- Style: detailed semi-realistic cutaway with smooth vertex-coloured continents,
  visible strata, distinct mantle/core materials, and a warm emissive core.
- Motion: the generic scene may provide subtle scale/particle motion; no
  Earth-specific TypeScript or geometry logic is required.

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

The MDX camera is `[4.2, 2.2, 4.8]`, target `[0, 0, 0]`, FOV 42. It matches the
poster camera after Blender Z-up to glTF Y-up conversion.

## Portability

Only this recipe uses Blender. The application depends on the GLB, WebP, manifest,
and named-node contract. Freezing the GLB/WebP requires no app changes; rebuilding
with another tool requires only preserving the same six IDs and coordinate contract.
