import { create } from 'zustand';

/** Shared selection state between the 3D island and the prose. */
export interface HotspotState {
  activeHotspot: string | null;
  hoveredHotspot: string | null;
  setActiveHotspot: (id: string | null) => void;
  setHoveredHotspot: (id: string | null) => void;
}

export const useHotspotStore = create<HotspotState>((set) => ({
  activeHotspot: null,
  hoveredHotspot: null,
  setActiveHotspot: (id) =>
    set((state) => (state.activeHotspot === id ? state : { activeHotspot: id })),
  setHoveredHotspot: (id) =>
    set((state) => (state.hoveredHotspot === id ? state : { hoveredHotspot: id })),
}));

interface FocusLock {
  expiresAt: number;
  id: string;
}

let focusLock: FocusLock | null = null;

/** Returns the landmark explicitly focused by a click while its scroll settles. */
export function activeFocusLock(): FocusLock | null {
  return focusLock && focusLock.expiresAt > Date.now() ? focusLock : null;
}

/** Reads the user's motion preference without assuming a DOM (tests run in Node). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Selects a landmark and brings its prose into view. Both the DOM overlay and
 * GLB raycasting go through this function so the two surfaces stay in sync.
 */
export function focusHotspot(id: string): void {
  useHotspotStore.getState().setActiveHotspot(id);
  focusLock = { expiresAt: Date.now() + 1200, id };
  if (typeof document === 'undefined') {
    return;
  }
  const section = document.querySelector(`[data-hotspot="${id}"]`);
  section?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
}
