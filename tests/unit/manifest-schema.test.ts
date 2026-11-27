import { describe, expect, it } from 'vitest';
import {
  clipIdSchema,
  hotspotIdSchema,
  sceneManifestSchema,
  type SceneManifest,
} from '../../src/lib/scene-manifest';

const manifest: SceneManifest = {
  model: { src: '/assets/heart/heart.glb', poster: '/assets/heart/heart-poster.webp' },
  camera: { position: [0, 0.3, 4.2], target: [0, 0, 0], fov: 42 },
  hotspots: [
    { id: 'left_ventricle', label: 'Left ventricle', position: [0.22, -0.18, 0.38] },
    { id: 'right_ventricle', label: 'Right ventricle', position: [-0.24, -0.16, 0.34] },
    { id: 'aorta', label: 'Aorta', position: [0.05, 0.48, 0.12] },
    { id: 'pulmonary_artery', label: 'Pulmonary artery', position: [-0.08, 0.42, 0.28] },
    { id: 'mitral_valve', label: 'Mitral valve', position: [0.16, 0.06, 0.26] },
    { id: 'aortic_valve', label: 'Aortic valve', position: [0.04, 0.18, 0.2] },
  ],
};

describe('sceneManifestSchema', () => {
  it('accepts the generic heart manifest', () => {
    expect(sceneManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it('accepts a second topic with MDX + frontmatter only', () => {
    const lung = {
      model: { src: '/assets/lung/lung.glb', poster: '/assets/lung/lung-poster.webp' },
      camera: { position: [1, 0, 3], target: [0, 0, 0] },
      hotspots: [
        { id: 'left_lung', label: 'Left lung', position: [-0.3, 0.1, 0] },
        { id: 'bronchus', label: 'Bronchus', position: [0, 0.4, 0.1] },
      ],
    };

    expect(sceneManifestSchema.parse(lung)).toEqual(lung);
  });

  it('rejects an invalid hotspot ID', () => {
    const invalid = structuredClone(manifest);
    invalid.hotspots[0].id = 'Left-Ventricle';
    expect(() => sceneManifestSchema.parse(invalid)).toThrow();
  });

  it('rejects a manifest with no hotspots', () => {
    expect(() => sceneManifestSchema.parse({ ...manifest, hotspots: [] })).toThrow();
  });

  it('rejects a malformed position vector', () => {
    const invalid = structuredClone(manifest);
    invalid.camera.position = [0, 1] as unknown as [number, number, number];
    expect(() => sceneManifestSchema.parse(invalid)).toThrow();
  });

  it('rejects a missing poster', () => {
    const invalid = structuredClone(manifest);
    delete (invalid.model as { poster?: string }).poster;
    expect(() => sceneManifestSchema.parse(invalid)).toThrow();
  });

  it('rejects a non-positive field of view', () => {
    const invalid = { ...manifest, camera: { ...manifest.camera, fov: 0 } };
    expect(() => sceneManifestSchema.parse(invalid)).toThrow();
  });
});

describe('sceneManifestSchema animation metadata', () => {
  function withAnimations(animations: NonNullable<SceneManifest['animations']>): SceneManifest {
    return { ...structuredClone(manifest), animations };
  }

  it('accepts valid clips and hotspot triggers', () => {
    const animated = withAnimations({
      clips: [
        { id: 'pulse', name: 'HeartPulse', duration: 0.6 },
        { id: 'flow' },
      ],
      triggers: [
        { hotspot: 'left_ventricle', clip: 'pulse' },
        { hotspot: 'aorta', clip: 'flow' },
      ],
    });
    expect(sceneManifestSchema.parse(animated)).toEqual(animated);
  });

  it('accepts lessons without animation metadata', () => {
    expect(manifest.animations).toBeUndefined();
    expect(sceneManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it('rejects a trigger that names an undeclared hotspot', () => {
    const invalid = withAnimations({
      clips: [{ id: 'pulse' }],
      triggers: [{ hotspot: 'unknown_structure', clip: 'pulse' }],
    });
    expect(() => sceneManifestSchema.parse(invalid)).toThrow(/not declared in the scene manifest/);
  });

  it('rejects a trigger that names an undeclared clip', () => {
    const invalid = withAnimations({
      clips: [{ id: 'pulse' }],
      triggers: [{ hotspot: 'aorta', clip: 'missing' }],
    });
    expect(() => sceneManifestSchema.parse(invalid)).toThrow(/not declared in the manifest/);
  });

  it('rejects duplicate clip IDs', () => {
    const invalid = withAnimations({
      clips: [{ id: 'pulse' }, { id: 'pulse' }],
      triggers: [{ hotspot: 'aorta', clip: 'pulse' }],
    });
    expect(() => sceneManifestSchema.parse(invalid)).toThrow(/Duplicate animation clip/);
  });

  it('rejects two triggers for the same hotspot', () => {
    const invalid = withAnimations({
      clips: [{ id: 'pulse' }, { id: 'flow' }],
      triggers: [
        { hotspot: 'aorta', clip: 'pulse' },
        { hotspot: 'aorta', clip: 'flow' },
      ],
    });
    expect(() => sceneManifestSchema.parse(invalid)).toThrow(/Duplicate animation trigger/);
  });

  it('rejects non-positive or non-finite durations', () => {
    for (const duration of [0, -1, Number.NaN]) {
      const invalid = withAnimations({
        clips: [{ id: 'pulse', duration }],
        triggers: [{ hotspot: 'aorta', clip: 'pulse' }],
      });
      expect(() => sceneManifestSchema.parse(invalid), `duration ${duration}`).toThrow();
    }
  });

  it('rejects malformed clip and trigger declarations', () => {
    const badId = withAnimations({
      clips: [{ id: 'Pulse' }],
      triggers: [{ hotspot: 'aorta', clip: 'Pulse' }],
    });
    expect(() => sceneManifestSchema.parse(badId)).toThrow();

    const emptyClips = withAnimations({ clips: [], triggers: [{ hotspot: 'aorta', clip: 'pulse' }] });
    expect(() => sceneManifestSchema.parse(emptyClips)).toThrow();

    const emptyTriggers = withAnimations({ clips: [{ id: 'pulse' }], triggers: [] });
    expect(() => sceneManifestSchema.parse(emptyTriggers)).toThrow();
  });
});

describe('hotspotIdSchema', () => {
  it('accepts lowercase snake_case IDs', () => {
    expect(hotspotIdSchema.parse('aortic_valve')).toBe('aortic_valve');
  });

  it('rejects uppercase and hyphenated IDs', () => {
    expect(() => hotspotIdSchema.parse('Aortic-Valve')).toThrow();
  });
});

describe('clipIdSchema', () => {
  it('accepts lowercase snake_case IDs', () => {
    expect(clipIdSchema.parse('ventricle_pulse')).toBe('ventricle_pulse');
  });

  it('rejects uppercase and hyphenated IDs', () => {
    expect(() => clipIdSchema.parse('Pulse-1')).toThrow();
  });
});
