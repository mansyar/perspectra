import { describe, expect, it } from 'vitest';
import {
  hotspotIdSchema,
  sceneManifestSchema,
  validateHotspotReferences,
} from '../../src/lib/scene-manifest';

const mdxFiles = import.meta.glob('../../src/content/lessons/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function requiredField(frontmatter: string, field: string, path: string): string {
  const match = new RegExp(`^${field}:[ \\t]*(\\S[^\\r\\n]*?)[ \\t]*$`, 'm').exec(frontmatter);
  if (!match) {
    throw new Error(`${path} is missing a valid "${field}" frontmatter field`);
  }
  return match[1];
}

function requiredNestedField(frontmatter: string, field: string, path: string): string {
  const match = new RegExp(`^[ \\t]+${field}:[ \\t]*(\\S[^\\r\\n]*?)[ \\t]*$`, 'm').exec(
    frontmatter,
  );
  if (!match) {
    throw new Error(`${path} is missing a valid nested "${field}" frontmatter field`);
  }
  return match[1];
}

function parseCoordinates(source: string): number[] {
  return source.split(',').map((coordinate) => {
    const value = coordinate.trim();
    return value === '' ? Number.NaN : Number(value);
  });
}

function parseVector(frontmatter: string, field: string, path: string): number[] {
  const match = new RegExp(`^[ \\t]+${field}:[ \\t]*\\[([^\\]\\r\\n]+)\\][ \\t]*$`, 'm').exec(
    frontmatter,
  );
  if (!match) {
    throw new Error(`${path} is missing a valid "${field}" vector`);
  }
  return parseCoordinates(match[1]);
}

function parseHotspots(frontmatter: string) {
  const pattern =
    /^[ \t]+-[ \t]+id:[ \t]*(\S+)[ \t]*\r?\n[ \t]+label:[ \t]*(\S[^\r\n]*?)[ \t]*\r?\n[ \t]+position:[ \t]*\[([^\]\r\n]+)\][ \t]*$/gm;
  return Array.from(frontmatter.matchAll(pattern), (match) => ({
    id: match[1],
    label: match[2],
    position: parseCoordinates(match[3]),
  }));
}

function items(sectionLines: string[]): Record<string, string>[] {
  const result: Record<string, string>[] = [];
  for (const line of sectionLines) {
    const item = /^[ \t]+-[ \t]+([a-z_]+):[ \t]*(.+?)[ \t]*$/.exec(line);
    if (item) {
      result.push({ [item[1]]: item[2] });
      continue;
    }
    const field = /^[ \t]+([a-z_]+):[ \t]*(.+?)[ \t]*$/.exec(line);
    if (field && result.length > 0) {
      result[result.length - 1][field[1]] = field[2];
    }
  }
  return result;
}

/** Reads the optional `animations:` frontmatter block without a YAML dependency. */
function parseAnimations(frontmatter: string): unknown | undefined {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => /^animations:[ \t]*$/.test(line));
  if (start === -1) {
    return undefined;
  }
  const nextTopLevel = lines.findIndex(
    (line, index) => index > start && /^[a-z][a-z_]*:[ \t]*$/.test(line),
  );
  const block = lines.slice(start + 1, nextTopLevel === -1 ? undefined : nextTopLevel);

  function section(name: string): string[] {
    const at = block.findIndex((line) => new RegExp(`^[ \\t]+${name}:[ \\t]*$`).test(line));
    if (at === -1) {
      return [];
    }
    const stop = block.findIndex(
      (line, index) => index > at && /^[ \t]+[a-z_]+:[ \t]*$/.test(line),
    );
    return block.slice(at + 1, stop === -1 ? undefined : stop);
  }

  return {
    clips: items(section('clips')).map((clip) => ({
      id: clip.id,
      ...(clip.name ? { name: clip.name } : {}),
      ...(clip.duration !== undefined ? { duration: Number(clip.duration) } : {}),
    })),
    triggers: items(section('triggers')).map((trigger) => ({
      hotspot: trigger.hotspot,
      clip: trigger.clip,
    })),
  };
}

function parseLesson(path: string, source: string) {
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!frontmatterMatch) {
    throw new Error(`${path} is missing its frontmatter block`);
  }

  const frontmatter = frontmatterMatch[1];
  const body = source.slice(frontmatterMatch[0].length);
  const fovMatch = /^[ \t]+fov:[ \t]*(\S+)[ \t]*$/m.exec(frontmatter);
  const animations = parseAnimations(frontmatter);
  const manifest = sceneManifestSchema.parse({
    model: {
      src: requiredNestedField(frontmatter, 'src', path),
      poster: requiredNestedField(frontmatter, 'poster', path),
    },
    camera: {
      position: parseVector(frontmatter, 'position', path),
      target: parseVector(frontmatter, 'target', path),
      ...(fovMatch ? { fov: Number(fovMatch[1]) } : {}),
    },
    hotspots: parseHotspots(frontmatter),
    ...(animations !== undefined ? { animations } : {}),
  });
  const declaredIds = manifest.hotspots.map((hotspot) => hotspot.id);
  const referencedIds = Array.from(
    body.matchAll(/data-hotspot=["']([^"']+)["']/g),
    (match) => match[1],
  );

  return {
    path,
    body,
    manifest,
    animations,
    declaredIds,
    referencedIds,
    title: requiredField(frontmatter, 'title', path),
    description: requiredField(frontmatter, 'description', path),
    topic: requiredField(frontmatter, 'topic', path),
    status: requiredField(frontmatter, 'status', path),
    order: Number(requiredField(frontmatter, 'order', path)),
  };
}

const lessons = Object.entries(mdxFiles).map(([path, source]) => parseLesson(path, source));

describe('lesson content contracts', () => {
  it('discovers MDX lessons to validate', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  describe.each(lessons)('$path', (lesson) => {
    it('has valid lesson frontmatter', () => {
      expect(lesson.title.trim()).not.toBe('');
      expect(lesson.description.trim()).not.toBe('');
      expect(lesson.topic.trim()).not.toBe('');
      expect(['live', 'coming-soon']).toContain(lesson.status);
      expect(Number.isInteger(lesson.order)).toBe(true);
      expect(lesson.order).toBeGreaterThan(0);
    });

    it('declares exactly six unique valid hotspot IDs', () => {
      expect(lesson.declaredIds).toHaveLength(6);
      expect(new Set(lesson.declaredIds).size).toBe(6);
      for (const id of lesson.declaredIds) {
        expect(hotspotIdSchema.safeParse(id).success).toBe(true);
      }
    });

    it('has exactly one matching body section for every manifest hotspot', () => {
      expect(lesson.referencedIds).toHaveLength(6);
      expect(new Set(lesson.referencedIds)).toEqual(new Set(lesson.declaredIds));
    });

    it('carries generic model and camera fields', () => {
      expect(lesson.manifest.model.src.trim()).not.toBe('');
      expect(lesson.manifest.model.poster.trim()).not.toBe('');
      expect(lesson.manifest.camera.position).toHaveLength(3);
      expect(lesson.manifest.camera.target).toHaveLength(3);
    });

    it('validates optional animation metadata without requiring it', () => {
      const animations = lesson.manifest.animations;
      if (animations) {
        expect(animations.clips.length).toBeGreaterThan(0);
        expect(animations.triggers.length).toBeGreaterThan(0);
      } else {
        expect(lesson.animations).toBeUndefined();
      }
    });

    it('passes the same build-time hotspot validation used by getStaticPaths', () => {
      expect(() =>
        validateHotspotReferences(lesson.body, lesson.manifest, { requireAll: true }),
      ).not.toThrow();
    });
  });
});

function syntheticLesson(animations: string): string {
  return `---
title: Synthetic lesson
description: A synthetic lesson for contract checks
topic: synthetic
status: live
order: 1
model:
  src: /assets/synthetic/synthetic.glb
  poster: /assets/synthetic/synthetic-poster.webp
camera:
  position: [0, 0, 4]
  target: [0, 0, 0]
  fov: 42
hotspots:
  - id: first
    label: First
    position: [0, 0, 0]
  - id: second
    label: Second
    position: [1, 0, 0]
${animations}---
<div id="first" data-hotspot="first"></div>
<div id="second" data-hotspot="second"></div>
`;
}

describe('frontmatter animation metadata', () => {
  const validAnimations = `animations:
  clips:
    - id: gentle_pulse
      name: SyntheticPulse
      duration: 0.5
    - id: settle
  triggers:
    - hotspot: first
      clip: gentle_pulse
    - hotspot: second
      clip: settle
`;

  it('accepts a lesson with no animations block', () => {
    const lesson = parseLesson('synthetic.mdx', syntheticLesson(''));
    expect(lesson.manifest.animations).toBeUndefined();
  });

  it('accepts valid clips and triggers declared in frontmatter', () => {
    const lesson = parseLesson('synthetic.mdx', syntheticLesson(validAnimations));
    expect(lesson.manifest.animations?.clips).toEqual([
      { id: 'gentle_pulse', name: 'SyntheticPulse', duration: 0.5 },
      { id: 'settle' },
    ]);
    expect(lesson.manifest.animations?.triggers).toEqual([
      { hotspot: 'first', clip: 'gentle_pulse' },
      { hotspot: 'second', clip: 'settle' },
    ]);
  });

  it('rejects frontmatter animations with an unknown hotspot', () => {
    const invalid = validAnimations.replace('hotspot: second', 'hotspot: missing');
    expect(() => parseLesson('synthetic.mdx', syntheticLesson(invalid))).toThrow(
      /not declared in the scene manifest/,
    );
  });

  it('rejects frontmatter animations with duplicate clips or triggers', () => {
    const duplicateClip = validAnimations.replace('id: settle', 'id: gentle_pulse');
    expect(() => parseLesson('synthetic.mdx', syntheticLesson(duplicateClip))).toThrow(
      /Duplicate animation clip/,
    );

    const duplicateTrigger = validAnimations.replace('hotspot: second', 'hotspot: first');
    expect(() => parseLesson('synthetic.mdx', syntheticLesson(duplicateTrigger))).toThrow(
      /Duplicate animation trigger/,
    );
  });

  it('rejects a non-positive frontmatter duration', () => {
    const invalid = validAnimations.replace('duration: 0.5', 'duration: 0');
    expect(() => parseLesson('synthetic.mdx', syntheticLesson(invalid))).toThrow();
  });
});
