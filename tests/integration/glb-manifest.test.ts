import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { focusPose, viewHeight, type Vec3 } from '../../src/components/scene/framing';

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
const frontmatter = frontmatterMatch[1];

const manifestIds = Array.from(
  frontmatterMatch[1].matchAll(/^\s+- id:\s*(\S+)\s*$/gm),
  (match) => match[1],
).sort();

interface GlbNode {
  name?: string;
  mesh?: number;
  translation?: number[];
}

interface GlbAccessor {
  min?: number[];
  max?: number[];
}

interface GlbDocument {
  nodes?: GlbNode[];
  meshes?: { primitives?: { attributes?: { POSITION?: number } }[] }[];
  accessors?: GlbAccessor[];
}

interface Bounds {
  max: Vec3;
  min: Vec3;
}

function glbJson(): GlbDocument {
  const view = new DataView(glbBytes.buffer, glbBytes.byteOffset, glbBytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x46546c67);
  expect(view.getUint32(4, true)).toBe(2);
  expect(view.getUint32(16, true)).toBe(0x4e4f534a);
  const length = view.getUint32(12, true);
  const text = new TextDecoder().decode(
    new Uint8Array(glbBytes.buffer, glbBytes.byteOffset + 20, length),
  );
  return JSON.parse(text) as GlbDocument;
}

function requiredMatch(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) {
    throw new Error(`Expected to find ${pattern.source} in heart.mdx frontmatter`);
  }
  return match;
}

function parseVec3(value: string): Vec3 {
  const numbers = value.split(',').map((part) => Number(part.trim()));
  if (numbers.length !== 3 || numbers.some((number) => !Number.isFinite(number))) {
    throw new Error(`Expected three finite numbers, received "${value}"`);
  }
  return numbers as unknown as Vec3;
}

function mdxPositions(): Map<string, Vec3> {
  const result = new Map<string, Vec3>();
  for (const block of frontmatter.split(/^\s+- id:\s*/m).slice(1)) {
    const id = /^(\S+)/.exec(block)?.[1];
    const position = /position:\s*\[([^\]]+)\]/.exec(block)?.[1];
    if (id && position) {
      result.set(id, parseVec3(position));
    }
  }
  return result;
}

function meshBounds(document: GlbDocument, node: GlbNode): Bounds {
  const accessorIndex = document.meshes?.[node.mesh ?? -1]?.primitives?.[0]?.attributes?.POSITION;
  const accessor = document.accessors?.[accessorIndex ?? -1];
  if (!accessor?.min || !accessor.max) {
    throw new Error(`Mesh node ${node.name ?? node.mesh} has no POSITION accessor bounds`);
  }
  const translation = node.translation ?? [0, 0, 0];
  return {
    min: [0, 1, 2].map((axis) => accessor.min![axis] + translation[axis]) as unknown as Vec3,
    max: [0, 1, 2].map((axis) => accessor.max![axis] + translation[axis]) as unknown as Vec3,
  };
}

function overallBounds(document: GlbDocument, bounds: Bounds[]): Bounds {
  const min = [0, 1, 2].map((axis) => Math.min(...bounds.map((box) => box.min[axis])));
  const max = [0, 1, 2].map((axis) => Math.max(...bounds.map((box) => box.max[axis])));
  return { min: min as unknown as Vec3, max: max as unknown as Vec3 };
}

function centre(box: Bounds): Vec3 {
  return [0, 1, 2].map((axis) => (box.min[axis] + box.max[axis]) / 2) as unknown as Vec3;
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalize(vector: Vec3): Vec3 {
  const size = Math.hypot(...vector);
  return [vector[0] / size, vector[1] / size, vector[2] / size];
}

/** Largest absolute vertical NDC coordinate among the model's eight bounding-box corners. */
function maxVerticalNdc(camera: Vec3, target: Vec3, fov: number, box: Bounds): number {
  const forward = normalize([target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]]);
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanHalf = Math.tan((fov * Math.PI) / 360);
  let largest = 0;
  for (const x of [box.min[0], box.max[0]]) {
    for (const y of [box.min[1], box.max[1]]) {
      for (const z of [box.min[2], box.max[2]]) {
        const vector: Vec3 = [x - camera[0], y - camera[1], z - camera[2]];
        const depth = dot(vector, forward);
        expect(depth).toBeGreaterThan(0);
        largest = Math.max(largest, Math.abs(dot(vector, up) / (depth * tanHalf)));
      }
    }
  }
  return largest;
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

  it('anchors every MDX hotspot at its named GLB mesh centre', () => {
    const document = glbJson();
    const positions = mdxPositions();
    expect(positions.size).toBe(manifestIds.length);
    const centres = new Map<string, Vec3>();
    for (const node of document.nodes ?? []) {
      if (typeof node.name === 'string' && typeof node.mesh === 'number') {
        centres.set(node.name, centre(meshBounds(document, node)));
      }
    }
    for (const id of manifestIds) {
      const expected = centres.get(id);
      const actual = positions.get(id);
      expect(expected, `GLB mesh ${id}`).toBeDefined();
      expect(actual, `MDX hotspot ${id}`).toBeDefined();
      for (const axis of [0, 1, 2]) {
        expect(Math.abs(actual![axis] - expected![axis]), `${id} axis ${axis}`).toBeLessThanOrEqual(
          0.1,
        );
      }
    }
  });

  it('frames the whole GLB with margin at rest and when any hotspot is focused', () => {
    const document = glbJson();
    const boxes = (document.nodes ?? [])
      .filter((node): node is GlbNode & { mesh: number } => typeof node.mesh === 'number')
      .map((node) => meshBounds(document, node));
    expect(boxes.length).toBeGreaterThan(0);
    const bounds = overallBounds(document, boxes);
    const modelHeight = bounds.max[1] - bounds.min[1];
    const cameraBlock = requiredMatch(/camera:\s*\r?\n([\s\S]*?)\r?\nhotspots:/, frontmatter)[1];
    const camera = parseVec3(requiredMatch(/position:\s*\[([^\]]+)\]/, cameraBlock)[1]);
    const target = parseVec3(requiredMatch(/target:\s*\[([^\]]+)\]/, cameraBlock)[1]);
    const fov = Number(requiredMatch(/fov:\s*([\d.]+)/, cameraBlock)[1]);

    expect(viewHeight(camera, target, fov) / modelHeight).toBeGreaterThanOrEqual(1.2);
    expect(maxVerticalNdc(camera, target, fov, bounds)).toBeLessThanOrEqual(1);

    for (const [id, hotspot] of mdxPositions()) {
      const pose = focusPose(camera, target, hotspot);
      expect(
        viewHeight(pose.camera, pose.target, fov) / modelHeight,
        `view height for ${id}`,
      ).toBeGreaterThanOrEqual(1.2);
      expect(
        maxVerticalNdc(pose.camera, pose.target, fov, bounds),
        `vertical framing for ${id}`,
      ).toBeLessThanOrEqual(1);
    }
  });
});
