export type RendererTier = 'webgpu' | 'webgl' | 'poster';

/**
 * Probes the strongest renderer the browser can actually start. The probe is
 * deliberately cheap and side-effect free: no Canvas is mounted until a tier
 * has been chosen.
 */
export async function detectRendererTier(): Promise<RendererTier> {
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        return 'webgpu';
      }
    } catch {
      // Adapter probing can reject on software stacks; try WebGL next.
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      if (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) {
        return 'webgl';
      }
    } catch {
      // A blocked WebGL context is the poster case, not an error.
    }
  }

  return 'poster';
}

/** Returns the next tier in the fallback ladder, or null when only the poster remains. */
export function nextTier(tier: RendererTier): RendererTier | null {
  if (tier === 'webgpu') {
    return 'webgl';
  }
  if (tier === 'webgl') {
    return 'poster';
  }
  return null;
}
