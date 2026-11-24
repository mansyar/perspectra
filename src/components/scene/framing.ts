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
