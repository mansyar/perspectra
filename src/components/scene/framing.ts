/** Shared camera framing math for the interactive scene and its regression test. */
export const FOCUS_TARGET_BLEND = 0.3;
export const FOCUS_CAMERA_BLEND = 0.15;

export type Vec3 = readonly [number, number, number];

export interface FocusPose {
  camera: Vec3;
  target: Vec3;
}

/** Keep the whole model framed while gently moving toward the active hotspot. */
export function focusPose(baseCamera: Vec3, baseTarget: Vec3, hotspot: Vec3): FocusPose {
  const target = baseTarget.map((value, index) => {
    return value + (hotspot[index] - value) * FOCUS_TARGET_BLEND;
  }) as unknown as Vec3;
  const camera = baseCamera.map((value, index) => {
    return value + target[index] * FOCUS_CAMERA_BLEND;
  }) as unknown as Vec3;
  return { camera, target };
}

/** Vertical world-space span visible at the target distance for a perspective camera. */
export function viewHeight(camera: Vec3, target: Vec3, fovDegrees: number): number {
  const dx = camera[0] - target[0];
  const dy = camera[1] - target[1];
  const dz = camera[2] - target[2];
  const distance = Math.hypot(dx, dy, dz);
  return 2 * distance * Math.tan((fovDegrees * Math.PI) / 360);
}

/** Shared target viewport ratios for framing checks. */
export const VIEWPORT_ASPECTS = {
  fourByThree: 4 / 3,
  square: 1,
  desktop: 1280 / 800,
} as const;

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export interface ProjectedBounds {
  horizontal: number;
  vertical: number;
}

/** Horizontal world-space span visible at the target distance. */
export function viewWidth(
  camera: Vec3,
  target: Vec3,
  fovDegrees: number,
  aspectRatio: number,
): number {
  return viewHeight(camera, target, fovDegrees) * aspectRatio;
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

function unit(vector: Vec3): Vec3 {
  const size = Math.hypot(...vector);
  return [vector[0] / size, vector[1] / size, vector[2] / size];
}

/**
 * Largest absolute NDC coordinate of the model's eight bounding-box corners on
 * each axis. Values at or below 1 are fully inside the frustum; the horizontal
 * extent depends on the viewport aspect ratio while the vertical extent does not.
 */
export function projectedBounds(
  camera: Vec3,
  target: Vec3,
  fovDegrees: number,
  aspectRatio: number,
  bounds: Bounds,
): ProjectedBounds {
  const forward = unit([target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]]);
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanHalf = Math.tan((fovDegrees * Math.PI) / 360);
  let horizontal = 0;
  let vertical = 0;
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const vector: Vec3 = [x - camera[0], y - camera[1], z - camera[2]];
        const depth = dot(vector, forward);
        if (depth <= 0) {
          throw new Error('Model bounds extend behind the camera');
        }
        horizontal = Math.max(
          horizontal,
          Math.abs(dot(vector, right) / (depth * tanHalf * aspectRatio)),
        );
        vertical = Math.max(vertical, Math.abs(dot(vector, up) / (depth * tanHalf)));
      }
    }
  }
  return { horizontal, vertical };
}
