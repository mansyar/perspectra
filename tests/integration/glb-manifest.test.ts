// @ts-expect-error Node's built-in type declarations are intentionally not installed.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const glbBytes: Uint8Array = readFileSync(new URL('../../assets/heart/heart.glb', import.meta.url));
const posterBytes: Uint8Array = readFileSync(
  new URL('../../public/assets/heart/heart-poster.png', import.meta.url),
);

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

const manifestIds = Array.from(
  frontmatterMatch[1].matchAll(/^\s+- id:\s*(\S+)\s*$/gm),
  (match) => match[1],
).sort();

interface GlbNode {
  name?: string;
  mesh?: number;
}

function glbJson(): { nodes?: GlbNode[] } {
  const view = new DataView(glbBytes.buffer, glbBytes.byteOffset, glbBytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x46546c67);
  expect(view.getUint32(4, true)).toBe(2);
  expect(view.getUint32(16, true)).toBe(0x4e4f534a);
  const length = view.getUint32(12, true);
  const text = new TextDecoder().decode(
    new Uint8Array(glbBytes.buffer, glbBytes.byteOffset + 20, length),
  );
  return JSON.parse(text) as { nodes?: GlbNode[] };
}

describe('heart GLB ↔ manifest contract', () => {
  it('keeps the GLB under the 1 MB budget', () => {
    expect(glbBytes.byteLength).toBeGreaterThan(0);
    expect(glbBytes.byteLength).toBeLessThan(1_000_000);
  });

  it('exports exactly the six manifest hotspot IDs as named mesh nodes', () => {
    const meshNames = (glbJson().nodes ?? [])
      .flatMap((node) =>
        typeof node.mesh === 'number' && typeof node.name === 'string' ? [node.name] : [],
      )
      .sort();
    expect(meshNames).toEqual(manifestIds);
    expect(meshNames).toHaveLength(6);
  });

  it('stays inside the draw-call budget', () => {
    const meshCount = (glbJson().nodes ?? []).filter(
      (node) => typeof node.mesh === 'number',
    ).length;
    expect(meshCount).toBeLessThan(100);
  });

  it('ships the fallback poster as a PNG', () => {
    expect(posterBytes.byteLength).toBeGreaterThan(0);
    expect(Array.from(posterBytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
