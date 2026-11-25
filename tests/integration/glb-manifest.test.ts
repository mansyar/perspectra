import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { focusPose, viewHeight, type Vec3 } from '../../src/components/scene/framing';

const mdxFiles = import.meta.glob('../../src/content/lessons/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

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

interface LessonAsset {
  id: string;
  modelSrc: string;
  posterPath: string;
  camera: Vec3;
  target: Vec3;
  fov: number;
  manifestIds: string[];
  positions: Map<string, Vec3>;
  glbBytes: Uint8Array;
  posterBytes: Uint8Array;
}

function requiredMatch(pattern: RegExp, text: string, context: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) {
    throw new Error(`Expected to find ${pattern.source} in ${context} frontmatter`);
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

function mdxPositions(frontmatter: string): Map<string, Vec3> {
  const result = new Map<string, Vec3>();
  for (const block of frontmatter.split(/^[ \t]+- id:[ \t]*/m).slice(1)) {
    const id = /^(\S+)/.exec(block)?.[1];
    const position = /position:\s*\[([^\]]+)\]/.exec(block)?.[1];
    if (id && position) {
      result.set(id, parseVec3(position));
    }
  }
  return result;
}

function parseLesson(path: string, source: string): LessonAsset | null {
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!frontmatterMatch) {
    throw new Error(`${path} is missing its frontmatter block`);
  }

  const frontmatter = frontmatterMatch[1];
  const context = `${path} MDX`;
  const status = requiredMatch(/^status:[ \t]*(\S+)[ \t]*$/m, frontmatter, context)[1];
  if (status !== 'live') {
    return null;
  }

  const modelSrc = requiredMatch(
    /^[ \t]+src:[ \t]*(\/assets\/\S+\.glb)[ \t]*$/m,
    frontmatter,
    context,
  )[1];
  const posterPath = requiredMatch(
    /^[ \t]+poster:[ \t]*(\/assets\/\S+\.webp)[ \t]*$/m,
    frontmatter,
    context,
  )[1];
  const cameraBlock = requiredMatch(
    /camera:\s*\r?\n([\s\S]*?)\r?\nhotspots:/,
    frontmatter,
    context,
  )[1];
  const id = path
    .split('/')
    .at(-1)
    ?.replace(/\.mdx$/, '');
  if (!id) {
    throw new Error(`Could not derive a lesson ID from ${path}`);
  }

  return {
    id,
    modelSrc,
    posterPath,
    camera: parseVec3(requiredMatch(/position:\s*\[([^\]]+)\]/, cameraBlock, context)[1]),
    target: parseVec3(requiredMatch(/target:\s*\[([^\]]+)\]/, cameraBlock, context)[1]),
    fov: Number(requiredMatch(/fov:\s*([\d.]+)/, cameraBlock, context)[1]),
    manifestIds: Array.from(
      frontmatter.matchAll(/^[ \t]+- id:\s*(\S+)\s*$/gm),
      (match) => match[1],
    ).toSorted(),
    positions: mdxPositions(frontmatter),
    glbBytes: readFileSync(new URL(`../../${modelSrc.slice(1)}`, import.meta.url)),
    posterBytes: readFileSync(new URL(`../../public${posterPath}`, import.meta.url)),
  };
}

const lessons = Object.entries(mdxFiles)
  .map(([path, source]) => parseLesson(path, source))
  .filter((lesson): lesson is LessonAsset => lesson !== null);

function glbJson(glbBytes: Uint8Array): GlbDocument {
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

function meshBounds(document: GlbDocument, node: GlbNode): Bounds {
  const accessorIndex = document.meshes?.[node.mesh ?? -1]?.primitives?.[0]?.attributes?.POSITION;
  const accessor = document.accessors?.[accessorIndex ?? -1];
  if (!accessor?.min || !accessor.max) {
    throw new Error(`Mesh node ${node.name ?? node.mesh} has no POSITION accessor bounds`);
  }
  const { min, max } = accessor;
  const translation = node.translation ?? [0, 0, 0];
  return {
    min: [0, 1, 2].map((axis) => min[axis] + translation[axis]) as unknown as Vec3,
    max: [0, 1, 2].map((axis) => max[axis] + translation[axis]) as unknown as Vec3,
  };
}

/** Baked meshes use their bounds centre; offset geometry can use its named node pivot. */
function hotspotAnchor(document: GlbDocument, node: GlbNode): Vec3 {
  const meshCentre = centre(meshBounds(document, node));
  const translation = node.translation ?? [0, 0, 0];
  if (!translation.some((value) => Math.abs(value) > 0.1)) {
    return meshCentre;
  }
  const localCentre: Vec3 = [
    meshCentre[0] - translation[0],
    meshCentre[1] - translation[1],
    meshCentre[2] - translation[2],
  ];
  if (localCentre.every((value) => Math.abs(value) <= 0.1)) {
    return meshCentre;
  }
  return [translation[0], translation[1], translation[2]];
}

function overallBounds(bounds: Bounds[]): Bounds {
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

describe('live lesson GLB ↔ manifest contracts', () => {
  it('discovers live lesson assets to validate', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  describe.each(lessons)('$id', (lesson) => {
    it('keeps the GLB under the 1 MB budget', () => {
      expect(lesson.glbBytes.byteLength).toBeGreaterThan(0);
      expect(lesson.glbBytes.byteLength).toBeLessThan(1_000_000);
    });

    it('exports exactly six unique manifest hotspot IDs as named mesh nodes', () => {
      const meshNames = (glbJson(lesson.glbBytes).nodes ?? [])
        .flatMap((node) =>
          typeof node.mesh === 'number' && typeof node.name === 'string' ? [node.name] : [],
        )
        .toSorted();
      expect(new Set(lesson.manifestIds).size).toBe(lesson.manifestIds.length);
      expect(lesson.manifestIds).toHaveLength(6);
      expect(meshNames).toEqual(lesson.manifestIds);
      expect(meshNames).toHaveLength(6);
    });

    it('stays inside the draw-call budget', () => {
      const meshCount = (glbJson(lesson.glbBytes).nodes ?? []).filter(
        (node) => typeof node.mesh === 'number',
      ).length;
      expect(meshCount).toBeLessThan(100);
    });

    it('ships the referenced poster as a WebP under 120 KB', () => {
      expect(lesson.posterPath).toBe(lesson.modelSrc.replace(/\.glb$/, '-poster.webp'));
      expect(lesson.posterBytes.byteLength).toBeGreaterThan(0);
      expect(lesson.posterBytes.byteLength).toBeLessThan(120_000);
      expect(new TextDecoder().decode(lesson.posterBytes.slice(0, 4))).toBe('RIFF');
      expect(new TextDecoder().decode(lesson.posterBytes.slice(8, 12))).toBe('WEBP');
    });

    it('anchors every MDX hotspot at its named GLB node centre', () => {
      const document = glbJson(lesson.glbBytes);
      expect(lesson.positions.size).toBe(lesson.manifestIds.length);
      const anchors = new Map<string, Vec3>();
      for (const node of document.nodes ?? []) {
        if (typeof node.name === 'string' && typeof node.mesh === 'number') {
          anchors.set(node.name, hotspotAnchor(document, node));
        }
      }
      for (const id of lesson.manifestIds) {
        const expected = anchors.get(id);
        const actual = lesson.positions.get(id);
        if (!expected || !actual) {
          throw new Error(`Missing GLB or MDX anchor for ${lesson.id}:${id}`);
        }
        for (const axis of [0, 1, 2]) {
          expect(Math.abs(actual[axis] - expected[axis]), `${id} axis ${axis}`).toBeLessThanOrEqual(
            0.1,
          );
        }
      }
    });

    it('frames the whole GLB with margin at rest and when any hotspot is focused', () => {
      const document = glbJson(lesson.glbBytes);
      const boxes = (document.nodes ?? [])
        .filter((node): node is GlbNode & { mesh: number } => typeof node.mesh === 'number')
        .map((node) => meshBounds(document, node));
      expect(boxes.length).toBeGreaterThan(0);
      const bounds = overallBounds(boxes);
      const modelHeight = bounds.max[1] - bounds.min[1];

      expect(
        viewHeight(lesson.camera, lesson.target, lesson.fov) / modelHeight,
      ).toBeGreaterThanOrEqual(1.2);
      expect(maxVerticalNdc(lesson.camera, lesson.target, lesson.fov, bounds)).toBeLessThanOrEqual(
        1,
      );

      for (const [id, hotspot] of lesson.positions) {
        const pose = focusPose(lesson.camera, lesson.target, hotspot);
        expect(
          viewHeight(pose.camera, pose.target, lesson.fov) / modelHeight,
          `view height for ${id}`,
        ).toBeGreaterThanOrEqual(1.2);
        expect(
          maxVerticalNdc(pose.camera, pose.target, lesson.fov, bounds),
          `vertical framing for ${id}`,
        ).toBeLessThanOrEqual(1);
      }
    });
  });
});
