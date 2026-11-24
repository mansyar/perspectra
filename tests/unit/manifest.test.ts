import { describe, expect, it } from 'vitest';
import {
  HotspotMismatchError,
  validateHotspotReferences,
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

const all = { requireAll: true };

function markup(id: string): string {
  return `<div data-hotspot="${id}"></div>`;
}

describe('validateHotspotReferences', () => {
  it('accepts matching double-quoted data-hotspot attributes', () => {
    const source = manifest.hotspots.map((hotspot) => markup(hotspot.id)).join('\n');
    expect(() => validateHotspotReferences(source, manifest, all)).not.toThrow();
  });

  it('accepts single-quoted data-hotspot attributes', () => {
    const source = "<div data-hotspot='aorta'></div>";
    expect(() => validateHotspotReferences(source, manifest)).not.toThrow();
  });

  it('throws when MDX references an unknown hotspot ID', () => {
    const source = markup('septum');
    expect(() => validateHotspotReferences(source, manifest)).toThrow(HotspotMismatchError);
  });

  it('throws when a manifest hotspot is missing from the MDX and requireAll is set', () => {
    const declared = manifest.hotspots.slice(0, -1);
    const source = declared.map((hotspot) => markup(hotspot.id)).join('\n');
    expect(() => validateHotspotReferences(source, manifest, all)).toThrow(/aortic_valve/);
  });

  it('allows a subset of hotspots by default', () => {
    expect(() => validateHotspotReferences(markup('aorta'), manifest)).not.toThrow();
  });

  it('ignores attributes other than data-hotspot', () => {
    const source = '<div data-layer="overview" id="aorta"></div>';
    expect(() => validateHotspotReferences(source, manifest)).not.toThrow();
  });
});
