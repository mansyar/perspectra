import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  VIEWPORT_ASPECTS,
  focusPose,
  projectedBounds,
  responsivePose,
  viewHeight,
  type Bounds,
  type Vec3,
} from '../../src/components/scene/framing';

const mdxFiles = import.meta.glob('../../src/content/lessons/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface GlbNode {
  name?: string;
  mesh?: number;
  translation?: number[];
  camera?: number;
  extensions?: Record<string, unknown>;
}

interface GlbAccessor {
  min?: number[];
  max?: number[];
}

interface GlbAnimation {
  name?: string;
  channels?: { target?: { node?: number } }[];
}

interface GlbDocument {
  nodes?: GlbNode[];
  meshes?: { primitives?: { attributes?: { POSITION?: number } }[] }[];
  accessors?: GlbAccessor[];
  animations?: GlbAnimation[];
  cameras?: unknown[];
  extensionsUsed?: string[];
}

interface LessonAnimations {
  clips: { id: string; name?: string; duration?: number }[];
  triggers: { hotspot: string; clip: string }[];
}

/** Lessons whose manifests explicitly author a clip and trigger for every hotspot. */
const FULL_ANIMATION_LESSONS = new Set(['heart', 'earth-interior']);

interface LessonAsset {
  id: string;
  modelSrc: string;
  posterPath: string;
  camera: Vec3;
  target: Vec3;
  fov: number;
  manifestIds: string[];
  positions: Map<string, Vec3>;
  animations: LessonAnimations | null;
  glbBytes: Uint8Array;
  posterBytes: Uint8Array;
}

/** Reads declared clips/triggers from an `animations:` block without a YAML dependency. */
function parseDeclaredAnimations(block: string): LessonAnimations {
  const lines = block.split(/\r?\n/);

  function sectionLines(name: string): string[] {
    const start = lines.findIndex((line) => new RegExp(`^[ \\t]+${name}:[ \\t]*$`).test(line));
    if (start === -1) {
      return [];
    }
    const stop = lines.findIndex(
      (line, index) => index > start && /^[ \t]+[a-z_]+:[ \t]*$/.test(line),
    );
    return lines.slice(start + 1, stop === -1 ? undefined : stop);
  }

  const clips = sectionLines('clips')
    .join('\n')
    .split(/^[ \t]+-[ \t]+id:[ \t]*/m)
    .slice(1)
    .map((entry) => {
      const id = /^(\S+)/.exec(entry)?.[1] ?? '';
      const name = /^[ \t]+name:[ \t]*(\S+)/m.exec(entry)?.[1];
      const duration = /^[ \t]+duration:[ \t]*([\d.]+)/m.exec(entry)?.[1];
      return {
        id,
        ...(name === undefined ? {} : { name }),
        ...(duration === undefined ? {} : { duration: Number(duration) }),
      };
    });
  const triggers = sectionLines('triggers')
    .join('\n')
    .split(/^[ \t]+-[ \t]+hotspot:[ \t]*/m)
    .slice(1)
    .map((entry) => ({
      hotspot: /^(\S+)/.exec(entry)?.[1] ?? '',
      clip: /^[ \t]+clip:[ \t]*(\S+)/m.exec(entry)?.[1] ?? '',
    }));
  return { clips, triggers };
}

/** Validates declared references without requiring animations or full hotspot coverage. */
function validateDeclaredTriggers(hotspotIds: string[], animations: LessonAnimations | null): void {
  if (!animations) {
    return;
  }
  const clips = new Set(animations.clips.map((clip) => clip.id));
  const hotspots = new Set(hotspotIds);
  const triggered = new Set<string>();
  for (const trigger of animations.triggers) {
    if (!hotspots.has(trigger.hotspot)) {
      throw new Error(`Trigger references unknown hotspot "${trigger.hotspot}"`);
    }
    if (!clips.has(trigger.clip)) {
      throw new Error(`Trigger references unknown clip "${trigger.clip}"`);
    }
    if (triggered.has(trigger.hotspot)) {
      throw new Error(`Duplicate trigger for hotspot "${trigger.hotspot}"`);
    }
    triggered.add(trigger.hotspot);
  }
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
  const hotspotsBlock = requiredMatch(
    /^hotspots:[ \t]*\r?\n([\s\S]*?)(?=\r?\nanimations:|(?![\s\S]))/m,
    frontmatter,
    context,
  )[1];
  const animationsBlock = /^animations:[ \t]*\r?\n([\s\S]*?)(?=(?![\s\S]))/m.exec(frontmatter)?.[1];
  const animations: LessonAnimations | null = animationsBlock
    ? parseDeclaredAnimations(animationsBlock)
    : null;
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
      hotspotsBlock.matchAll(/^[ \t]+- id:\s*(\S+)\s*$/gm),
      (match) => match[1],
    ).toSorted(),
    positions: mdxPositions(hotspotsBlock),
    animations,
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

    it('exports declared clips as named, hotspot-bound GLB animations', () => {
      const document = glbJson(lesson.glbBytes);
      const exported = document.animations ?? [];
      const names = exported.flatMap((animation) =>
        typeof animation.name === 'string' ? [animation.name] : [],
      );
      expect(new Set(names).size, 'exported animation names are unique').toBe(names.length);
      const nodes = document.nodes ?? [];
      const hotspotMeshes = new Set(
        nodes
          .filter(
            (node): node is GlbNode & { name: string } =>
              typeof node.mesh === 'number' && typeof node.name === 'string',
          )
          .map((node) => node.name),
      );
      expect(hotspotMeshes, 'named hotspot meshes match the manifest').toEqual(
        new Set(lesson.manifestIds),
      );

      // Every exported clip binds to a named hotspot mesh; no ambient-only clips.
      for (const animation of exported) {
        const channels = animation.channels ?? [];
        expect(channels.length, `${animation.name} has channels`).toBeGreaterThan(0);
        for (const channel of channels) {
          const node = channel.target?.node;
          expect(node, `${animation.name} target`).toBeGreaterThanOrEqual(0);
          expect(node, `${animation.name} target`).toBeLessThan(nodes.length);
        }
        const targets = channels.flatMap((channel) => {
          const node = channel.target?.node;
          return node === undefined ? [] : [nodes[node]?.name ?? ''];
        });
        expect(
          targets.some((name) => hotspotMeshes.has(name)),
          `${animation.name} animates a named hotspot mesh`,
        ).toBe(true);
      }

      const animations = lesson.animations;
      if (!animations) {
        return; // Animation metadata is optional; a static lesson is valid.
      }
      const clipIds = animations.clips.map((clip) => clip.id);
      expect(new Set(clipIds).size, 'declared clip IDs are unique').toBe(clipIds.length);
      for (const clip of animations.clips) {
        const name = clip.name ?? clip.id;
        expect(names.includes(name), `${clip.id} resolves GLB animation "${name}"`).toBe(true);
        if (clip.duration !== undefined) {
          expect(clip.duration, `${clip.id} duration`).toBeGreaterThan(0);
        }
      }

      if (FULL_ANIMATION_LESSONS.has(lesson.id)) {
        expect(animations.clips, `${lesson.id} authors six clips`).toHaveLength(6);
        // Authored lessons keep the strict bijection: no missing or ambient clips.
        expect(names.toSorted(), `${lesson.id} has no undeclared ambient clip`).toEqual(
          animations.clips.map((clip) => clip.name ?? clip.id).toSorted(),
        );
        for (const clip of animations.clips) {
          expect(clip.name, `${clip.id} has a GLB animation name`).toBeTruthy();
          expect(clip.duration, `${clip.id} duration`).toBeGreaterThan(0);
        }
      }
    });

    it('validates declared triggers without requiring full coverage', () => {
      expect(() => validateDeclaredTriggers(lesson.manifestIds, lesson.animations)).not.toThrow();
      const animations = lesson.animations;
      if (!animations || !FULL_ANIMATION_LESSONS.has(lesson.id)) {
        return;
      }
      expect(animations.triggers.map((trigger) => trigger.hotspot).toSorted()).toEqual(
        lesson.manifestIds,
      );
      const clipIds = new Set(animations.clips.map((clip) => clip.id));
      expect(new Set(animations.triggers.map((trigger) => trigger.clip))).toEqual(clipIds);
      for (const trigger of animations.triggers) {
        expect(clipIds.has(trigger.clip), `${trigger.hotspot} -> ${trigger.clip}`).toBe(true);
      }
    });

    it('exports no cameras or punctual lights', () => {
      const document = glbJson(lesson.glbBytes);
      expect(document.cameras ?? []).toHaveLength(0);
      expect(document.extensionsUsed ?? []).not.toContain('KHR_lights_punctual');
      for (const node of document.nodes ?? []) {
        expect(node.camera, `${node.name} camera`).toBeUndefined();
        expect(node.extensions?.KHR_lights_punctual, `${node.name} light`).toBeUndefined();
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

      const restRatio = viewHeight(lesson.camera, lesson.target, lesson.fov) / modelHeight;
      expect(restRatio).toBeGreaterThanOrEqual(1.2);
      const baselineRatio =
        lesson.id === 'heart' ? 1.5077 : lesson.id === 'earth-interior' ? 2.5257 : undefined;
      if (baselineRatio !== undefined) {
        expect(restRatio, `${lesson.id} presence exceeds the phase-1 baseline`).toBeLessThan(
          baselineRatio - 0.05,
        );
      }

      const poses: { label: string; camera: Vec3; target: Vec3 }[] = [
        { label: 'rest', camera: lesson.camera, target: lesson.target },
      ];
      for (const [id, hotspot] of lesson.positions) {
        const pose = focusPose(lesson.camera, lesson.target, hotspot);
        poses.push({ label: id, camera: pose.camera, target: pose.target });
      }

      for (const pose of poses) {
        expect(
          viewHeight(pose.camera, pose.target, lesson.fov) / modelHeight,
          `view height for ${pose.label}`,
        ).toBeGreaterThanOrEqual(1.2);
        for (const aspect of Object.values(VIEWPORT_ASPECTS)) {
          const framed = projectedBounds(pose.camera, pose.target, lesson.fov, aspect, bounds);
          expect(
            framed.vertical,
            `vertical framing for ${pose.label} at aspect ${aspect}`,
          ).toBeLessThanOrEqual(1);
          expect(
            framed.horizontal,
            `horizontal framing for ${pose.label} at aspect ${aspect}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    });

    it('keeps responsive camera poses safe at the target page aspect ratios', () => {
      const document = glbJson(lesson.glbBytes);
      const boxes = (document.nodes ?? [])
        .filter((node): node is GlbNode & { mesh: number } => typeof node.mesh === 'number')
        .map((node) => meshBounds(document, node));
      expect(boxes.length).toBeGreaterThan(0);
      const bounds = overallBounds(boxes);
      // The runtime feeds the canvas aspect to responsivePose; cover the exact
      // desktop and mobile page ratios used by the acceptance pass.
      const pageAspects = {
        '1024x768': 1024 / 768,
        '1280x800': 1280 / 800,
        '390x844': 390 / 844,
      } as const;
      const hotspots: (Vec3 | null)[] = [null, ...lesson.positions.values()];
      for (const [label, aspect] of Object.entries(pageAspects)) {
        for (const [index, hotspot] of hotspots.entries()) {
          const pose = responsivePose(lesson.camera, lesson.target, hotspot, lesson.fov, aspect);
          const framed = projectedBounds(pose.camera, pose.target, lesson.fov, aspect, bounds);
          expect(
            framed.vertical,
            `${lesson.id} ${label} vertical pose ${index}`,
          ).toBeLessThanOrEqual(1);
          expect(
            framed.horizontal,
            `${lesson.id} ${label} horizontal pose ${index}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});

describe('declared animation validation', () => {
  const hotspots = ['first', 'second'];
  const declarations: LessonAnimations = {
    clips: [
      { id: 'gentle_pulse', name: 'SyntheticPulse', duration: 0.5 },
      { id: 'settle' },
    ],
    triggers: [
      { hotspot: 'first', clip: 'gentle_pulse' },
      { hotspot: 'second', clip: 'settle' },
    ],
  };

  it('parses clips with an omitted name and duration', () => {
    const block =
      '  clips:\n    - id: settle\n  triggers:\n    - hotspot: first\n      clip: settle\n';
    expect(parseDeclaredAnimations(block).clips).toEqual([{ id: 'settle' }]);
    expect(parseDeclaredAnimations(block).triggers).toEqual([
      { hotspot: 'first', clip: 'settle' },
    ]);
  });

  it('accepts lessons without animation metadata', () => {
    expect(() => validateDeclaredTriggers(hotspots, null)).not.toThrow();
  });

  it('accepts a valid subset of hotspot triggers', () => {
    const subset: LessonAnimations = {
      clips: declarations.clips,
      triggers: [declarations.triggers[0]],
    };
    expect(() => validateDeclaredTriggers(hotspots, subset)).not.toThrow();
  });

  it('rejects a trigger referencing an undeclared clip', () => {
    const invalid: LessonAnimations = {
      clips: declarations.clips,
      triggers: [{ hotspot: 'first', clip: 'missing_clip' }],
    };
    expect(() => validateDeclaredTriggers(hotspots, invalid)).toThrow(/unknown clip/);
  });

  it('rejects a trigger referencing an undeclared hotspot', () => {
    const invalid: LessonAnimations = {
      clips: declarations.clips,
      triggers: [{ hotspot: 'missing', clip: 'settle' }],
    };
    expect(() => validateDeclaredTriggers(hotspots, invalid)).toThrow(/unknown hotspot/);
  });
});
