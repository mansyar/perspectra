import { describe, expect, it } from 'vitest';
import {
  hotspotIdSchema,
  validateHotspotReferences,
  type SceneManifest,
} from '../../src/lib/scene-manifest';

const mdxFiles = import.meta.glob('../../src/content/lessons/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const source = Object.values(mdxFiles)[0];
const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);

if (!frontmatterMatch) {
  throw new Error('heart.mdx is missing its frontmatter block');
}

const frontmatter = frontmatterMatch[1];
const body = source.slice(frontmatterMatch[0].length);
const declaredIds = Array.from(
  frontmatter.matchAll(/^\s+- id:\s*(\S+)\s*$/gm),
  (match) => match[1],
);
const referencedIds = Array.from(
  body.matchAll(/data-hotspot=["']([^"']+)["']/g),
  (match) => match[1],
);

describe('heart lesson content contract', () => {
  it('declares exactly six valid hotspot IDs', () => {
    expect(declaredIds).toHaveLength(6);
    for (const id of declaredIds) {
      expect(hotspotIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('every referenced hotspot is declared, and every declared hotspot is referenced', () => {
    expect(new Set(referencedIds)).toEqual(new Set(declaredIds));
  });

  it('carries generic model and camera frontmatter', () => {
    expect(frontmatter).toMatch(/^model:/m);
    expect(frontmatter).toMatch(/^camera:/m);
    expect(frontmatter).toMatch(/^\s+src:\s*\S+/m);
    expect(frontmatter).toMatch(/^\s+poster:\s*\S+/m);
  });

  it('passes the same build-time validation used by getStaticPaths', () => {
    const manifest = {
      model: { src: '/assets/heart/heart.glb', poster: '/assets/heart/heart-poster.webp' },
      camera: { position: [0, 0, 4], target: [0, 0, 0] },
      hotspots: declaredIds.map((id, index) => ({ id, label: id, position: [index, 0, 0] })),
    } satisfies SceneManifest;

    expect(() => validateHotspotReferences(body, manifest, { requireAll: true })).not.toThrow();
  });
});
