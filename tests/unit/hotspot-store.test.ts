import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeFocusLock,
  focusHotspot,
  prefersReducedMotion,
  useHotspotStore,
} from '../../src/lib/hotspot-store';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
    vi.stubGlobal('window', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reports reduced motion from matchMedia', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('focusHotspot', () => {
  it('selects the hotspot and scrolls its prose smoothly', () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal('document', { querySelector: vi.fn(() => ({ scrollIntoView })) });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    focusHotspot('aorta');
    expect(useHotspotStore.getState().activeHotspot).toBe('aorta');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('uses instant scrolling when reduced motion is requested', () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal('document', { querySelector: vi.fn(() => ({ scrollIntoView })) });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    focusHotspot('mitral_valve');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('expires the focus lock and tolerates a missing DOM', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    vi.stubGlobal('document', undefined);
    focusHotspot('aortic_valve');
    expect(activeFocusLock()?.id).toBe('aortic_valve');
    vi.spyOn(Date, 'now').mockReturnValue(2201);
    expect(activeFocusLock()).toBe(null);
  });
});
