import { describe, expect, it } from 'vitest';
import {
  FOCUS_CAMERA_BLEND,
  FOCUS_TARGET_BLEND,
  VIEWPORT_ASPECTS,
  focusPose,
  projectedBounds,
  viewHeight,
  viewWidth,
  type Bounds,
  type Vec3,
} from '../../src/components/scene/framing';

const camera: Vec3 = [0, 0, 5];
const target: Vec3 = [0, 0, 0];
const bounds: Bounds = { min: [-1, -1, 0], max: [1, 1, 0] };

describe('focusPose', () => {
  it('blends target toward the hotspot and camera toward that target', () => {
    const baseCamera: Vec3 = [0, 0, 7];
    const baseTarget: Vec3 = [0, 0.5, 0];
    const hotspot: Vec3 = [1, -0.5, 0];
    const pose = focusPose(baseCamera, baseTarget, hotspot);

    expect(pose.target).toEqual([
      0 + 1 * FOCUS_TARGET_BLEND,
      0.5 + (-0.5 - 0.5) * FOCUS_TARGET_BLEND,
      0,
    ]);
    expect(pose.camera).toEqual([
      0 + pose.target[0] * FOCUS_CAMERA_BLEND,
      0 + pose.target[1] * FOCUS_CAMERA_BLEND,
      7 + pose.target[2] * FOCUS_CAMERA_BLEND,
    ]);
  });

  it('does not mutate the base camera, target or hotspot', () => {
    const baseCamera: Vec3 = [1, 2, 3];
    const baseTarget: Vec3 = [0, 0, 0];
    const hotspot: Vec3 = [0.4, -0.2, 0.1];
    focusPose(baseCamera, baseTarget, hotspot);

    expect(baseCamera).toEqual([1, 2, 3]);
    expect(baseTarget).toEqual([0, 0, 0]);
    expect(hotspot).toEqual([0.4, -0.2, 0.1]);
  });
});

describe('view spans', () => {
  it('calculates the vertical span from distance and field of view', () => {
    expect(viewHeight(camera, target, 90)).toBeCloseTo(10);
    expect(viewHeight(camera, target, 60)).toBeCloseTo(10 * Math.tan(Math.PI / 6));
  });

  it.each([
    { label: '4:3', aspect: VIEWPORT_ASPECTS.fourByThree, expected: 40 / 3 },
    { label: '1:1', aspect: VIEWPORT_ASPECTS.square, expected: 10 },
    { label: 'desktop', aspect: VIEWPORT_ASPECTS.desktop, expected: 16 },
  ])('calculates the horizontal span at $label', ({ aspect, expected }) => {
    expect(viewWidth(camera, target, 90, aspect)).toBeCloseTo(expected);
  });
});

describe('projectedBounds', () => {
  it('evaluates vertical and horizontal NDC extents at each target ratio', () => {
    const fourByThree = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.fourByThree, bounds);
    const square = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.square, bounds);
    const desktop = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.desktop, bounds);

    expect(fourByThree.horizontal).toBeCloseTo(0.15);
    expect(fourByThree.vertical).toBeCloseTo(0.2);
    expect(square.horizontal).toBeCloseTo(0.2);
    expect(square.vertical).toBeCloseTo(0.2);
    expect(desktop.horizontal).toBeCloseTo(0.125);
    expect(desktop.vertical).toBeCloseTo(0.2);
  });

  it('keeps vertical framing constant while wider viewports relax horizontal bounds', () => {
    const square = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.square, bounds);
    const desktop = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.desktop, bounds);

    expect(desktop.vertical).toBeCloseTo(square.vertical);
    expect(desktop.horizontal).toBeLessThan(square.horizontal);
  });

  it('detects a model that overflows horizontally on a narrow viewport', () => {
    const wideModel: Bounds = { min: [-6, -1, 0], max: [6, 1, 0] };
    const square = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.square, wideModel);
    const desktop = projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.desktop, wideModel);

    expect(square.horizontal).toBeCloseTo(1.2);
    expect(square.vertical).toBeCloseTo(0.2);
    expect(desktop.horizontal).toBeCloseTo(0.75);
    expect(desktop.vertical).toBeCloseTo(0.2);
  });

  it('preserves the whole-model margin guarantee for a synthetic model', () => {
    const modelHeight = bounds.max[1] - bounds.min[1];
    expect(viewHeight(camera, target, 90) / modelHeight).toBeGreaterThanOrEqual(1.2);
    for (const aspect of Object.values(VIEWPORT_ASPECTS)) {
      const projected = projectedBounds(camera, target, 90, aspect, bounds);
      expect(projected.vertical).toBeLessThanOrEqual(1);
      expect(projected.horizontal).toBeLessThanOrEqual(1);
    }
  });

  it('rejects bounds that extend behind the camera', () => {
    const behind: Bounds = { min: [-1, -1, 6], max: [1, 1, 7] };
    expect(() => projectedBounds(camera, target, 90, VIEWPORT_ASPECTS.square, behind)).toThrow(
      /behind the camera/,
    );
  });
});
