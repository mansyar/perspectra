import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';
import { sceneManifestSchema } from './lib/scene-manifest';

/**
 * One collection for every topic. The scene manifest is validated here so a
 * malformed model/camera/hotspot declaration fails the build before rendering.
 */
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    topic: z.string().min(1),
    status: z.enum(['live', 'coming-soon']),
    order: z.number().int().positive(),
    ...sceneManifestSchema.shape,
  }),
});

export const collections = { lessons };
