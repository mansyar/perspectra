import { beforeEach, describe, expect, it } from 'vitest';
import { prefersReducedMotion, useHotspotStore } from '../../src/lib/hotspot-store';

describe('hotspot store', () => {
  beforeEach(() => {
    useHotspotStore.setState({ activeHotspot: null, hoveredHotspot: null });
  });

  it('starts with no active or hovered hotspot', () => {
    const state = useHotspotStore.getState();
    expect(state.activeHotspot).toBe(null);
    expect(state.hoveredHotspot).toBe(null);
  });

  it('sets and replaces the active hotspot', () => {
    useHotspotStore.getState().setActiveHotspot('aorta');
    expect(useHotspotStore.getState().activeHotspot).toBe('aorta');
    useHotspotStore.getState().setActiveHotspot('mitral_valve');
    expect(useHotspotStore.getState().activeHotspot).toBe('mitral_valve');
  });

  it('treats re-selecting the same hotspot as a no-op', () => {
    useHotspotStore.getState().setActiveHotspot('aorta');
    const before = useHotspotStore.getState();
    useHotspotStore.getState().setActiveHotspot('aorta');
    expect(useHotspotStore.getState()).toBe(before);
  });

  it('clears the active hotspot when passed null', () => {
    useHotspotStore.getState().setActiveHotspot('aorta');
    useHotspotStore.getState().setActiveHotspot(null);
    expect(useHotspotStore.getState().activeHotspot).toBe(null);
  });

  it('tracks hover independently of selection', () => {
    useHotspotStore.getState().setHoveredHotspot('aortic_valve');
    expect(useHotspotStore.getState().hoveredHotspot).toBe('aortic_valve');
    expect(useHotspotStore.getState().activeHotspot).toBe(null);
    useHotspotStore.getState().setHoveredHotspot(null);
    expect(useHotspotStore.getState().hoveredHotspot).toBe(null);
  });

  it('reports no reduced-motion preference outside a browser', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
