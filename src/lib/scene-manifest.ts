import { z } from 'zod';

/** A 3D coordinate in renderer-agnostic scene units. */
export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

/** Hotspot IDs are stable, lowercase, machine-readable anchors shared by MDX and the renderer. */
export const hotspotIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, 'Hotspot IDs must be lowercase snake_case identifiers');

/** Clip IDs are stable, lowercase animation anchors shared by MDX and the GLB. */
export const clipIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, 'Clip IDs must be lowercase snake_case identifiers');

export const hotspotSchema = z.object({
  id: hotspotIdSchema,
  label: z.string().min(1),
  position: vec3Schema,
});

/** A brief, one-shot GLB animation that a hotspot trigger may play. */
export const animationClipSchema = z.object({
  id: clipIdSchema,
  /** GLB animation name; defaults to `id` when the renderer resolves the clip. */
  name: z.string().min(1).optional(),
  /** Playback length in seconds, overriding the authored clip duration when present. */
  duration: z.number().positive().optional(),
});

/** Links one declared hotspot to one declared animation clip. */
export const hotspotTriggerSchema = z.object({
  hotspot: hotspotIdSchema,
  clip: clipIdSchema,
});

/** The renderer consumes only this shape; no subject-specific vocabulary lives here. */
export const sceneManifestSchema = z
  .object({
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
    /** Omitted by static lessons; when declared, all references must resolve. */
    animations: z
      .object({
        clips: z.array(animationClipSchema).min(1),
        triggers: z.array(hotspotTriggerSchema).min(1),
      })
      .optional(),
  })
  .superRefine((manifest, ctx) => {
    const animations = manifest.animations;
    if (!animations) {
      return;
    }
    const hotspotIds = new Set(manifest.hotspots.map((hotspot) => hotspot.id));
    const clipIds = new Set<string>();
    for (const [index, clip] of animations.clips.entries()) {
      if (clipIds.has(clip.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['animations', 'clips', index, 'id'],
          message: `Duplicate animation clip "${clip.id}".`,
        });
      }
      clipIds.add(clip.id);
    }
    const triggered = new Set<string>();
    for (const [index, trigger] of animations.triggers.entries()) {
      if (!hotspotIds.has(trigger.hotspot)) {
        ctx.addIssue({
          code: 'custom',
          path: ['animations', 'triggers', index, 'hotspot'],
          message: `Animation trigger references hotspot "${trigger.hotspot}" that is not declared in the scene manifest.`,
        });
      }
      if (!clipIds.has(trigger.clip)) {
        ctx.addIssue({
          code: 'custom',
          path: ['animations', 'triggers', index, 'clip'],
          message: `Animation trigger references clip "${trigger.clip}" that is not declared in the manifest.`,
        });
      }
      if (triggered.has(trigger.hotspot)) {
        ctx.addIssue({
          code: 'custom',
          path: ['animations', 'triggers', index],
          message: `Duplicate animation trigger for hotspot "${trigger.hotspot}".`,
        });
      }
      triggered.add(trigger.hotspot);
    }
  });

export type Hotspot = z.infer<typeof hotspotSchema>;
export type AnimationClip = z.infer<typeof animationClipSchema>;
export type HotspotTrigger = z.infer<typeof hotspotTriggerSchema>;
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
