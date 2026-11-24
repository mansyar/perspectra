import { z } from 'zod';

/** A 3D coordinate in renderer-agnostic scene units. */
export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

/** Hotspot IDs are stable, lowercase, machine-readable anchors shared by MDX and the renderer. */
export const hotspotIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, 'Hotspot IDs must be lowercase snake_case identifiers');

export const hotspotSchema = z.object({
  id: hotspotIdSchema,
  label: z.string().min(1),
  position: vec3Schema,
});

/** The renderer consumes only this shape; no subject-specific vocabulary lives here. */
export const sceneManifestSchema = z.object({
  model: z.object({
    src: z.string().min(1),
    poster: z.string().min(1),
  }),
  camera: z.object({
    position: vec3Schema,
    target: vec3Schema,
    fov: z.number().positive().optional(),
  }),
  hotspots: z.array(hotspotSchema).min(1),
});

export type Hotspot = z.infer<typeof hotspotSchema>;
export type SceneManifest = z.infer<typeof sceneManifestSchema>;

export interface HotspotValidationOptions {
  requireAll?: boolean;
}

export class HotspotMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HotspotMismatchError';
  }
}

const HOTSPOT_ATTRIBUTE = /data-hotspot=["']([^"']+)["']/g;

/**
 * Fails a build when MDX hotspot anchors and the manifest disagree.
 * Called from `getStaticPaths`, so a mismatch aborts `astro build`.
 */
export function validateHotspotReferences(
  source: string,
  manifest: SceneManifest,
  options: HotspotValidationOptions = {},
): void {
  const allowed = new Set(manifest.hotspots.map((hotspot) => hotspot.id));
  const referenced = new Set<string>();

  for (const match of source.matchAll(HOTSPOT_ATTRIBUTE)) {
    const id = match[1];
    referenced.add(id);
    if (!allowed.has(id)) {
      const declared = Array.from(allowed).join(', ');
      throw new HotspotMismatchError(
        `MDX references hotspot "${id}" that is not declared in the scene manifest. Declared: ${declared}.`,
      );
    }
  }

  if (options.requireAll === true) {
    for (const id of allowed) {
      if (!referenced.has(id)) {
        throw new HotspotMismatchError(
          `Manifest hotspot "${id}" has no matching data-hotspot attribute in the MDX.`,
        );
      }
    }
  }
}
