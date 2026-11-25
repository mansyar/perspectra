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

function parseLesson(path: string, source: string) {
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!frontmatterMatch) {
    throw new Error(`${path} is missing its frontmatter block`);
  }

  const frontmatter = frontmatterMatch[1];
  const body = source.slice(frontmatterMatch[0].length);
  const fovMatch = /^[ \t]+fov:[ \t]*(\S+)[ \t]*$/m.exec(frontmatter);
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

    it('passes the same build-time hotspot validation used by getStaticPaths', () => {
      expect(() =>
        validateHotspotReferences(lesson.body, lesson.manifest, { requireAll: true }),
      ).not.toThrow();
    });
  });
});
