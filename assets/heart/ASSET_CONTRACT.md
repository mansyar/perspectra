# Heart asset contract

The renderer depends only on this contract, not on Blender.

## Source of truth

- `assets/heart/build_heart.py` — deterministic Blender recipe (Blender 5.2 LTS).
- `assets/heart/heart.glb` — exported glTF 2.0 binary, committed.
- `public/assets/heart/heart-poster.png` — reproducible WebP source poster, committed.
- `public/assets/heart/heart-poster.webp` — delivered fallback poster, committed.

Regenerate from the project root with:

```
blender --background --python assets/heart/build_heart.py
```

Interactive Blender MCP edits are allowed while authoring, but any such edit must be
baked back into `build_heart.py` before the asset is committed. The script is the
authoritative source.

## Required exports

- glTF 2.0, Y-up, baked transforms, six separate named mesh nodes.
- Mesh node names are exactly the hotspot IDs:

| ID | Meaning |
| --- | --- |
| `left_ventricle` | Thick-walled oxygenated chamber |
| `right_ventricle` | Deoxygenated chamber |
| `aorta` | Oxygenated arterial arch |
| `pulmonary_artery` | Deoxygenated vessel |
| `mitral_valve` | Left atrioventricular valve |
| `aortic_valve` | Aortic root valve |

- Total GLB size < 1 MB; target < 100 draw calls.
- No cameras, lights, animations, external textures, Draco, or KTX2 required.
- Style: semi-realistic low-poly; pink/red myocardium, purple right ventricle,
  red aorta, blue pulmonary artery, warm valve tissue.
- Poster: 960×960 WebP, dark cinematic background, same camera framing as the scene.
- The PNG is retained as the deterministic source for Blender's native WebP export.
- The delivered `heart-poster.webp` must be < 120,000 bytes so it remains eligible for the LCP image.

## Portability

Porting away from Blender requires no application changes: freeze the GLB, or
regenerate an equivalent named-mesh glTF with another tool. The app reads only
plain glTF 2.0 node names and the manifest.
