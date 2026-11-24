import { useEffect } from 'react';
import { activeFocusLock, useHotspotStore } from '../../lib/hotspot-store';
import './prose-hotspots.css';

/**
 * Zero-DOM React island: keeps the shared selection in sync with the prose
 * landmark closest to the viewport centre. Scroll events are throttled to one
 * update per frame; an explicit click keeps its selection while the scroll
 * it triggers settles.
 */
export function ProseHotspotBinder(): null {
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);

  useEffect(() => {
    // MDX emits empty wrapper paragraphs around each layer; drop them so every
    // landmark exposes exactly its three prose layers.
    for (const section of document.querySelectorAll<HTMLElement>('[data-hotspot]')) {
      for (const paragraph of section.querySelectorAll('p')) {
        if (paragraph.children.length === 0 && !paragraph.textContent?.trim()) {
          paragraph.remove();
        }
      }
    }
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-hotspot]'));
    if (sections.length === 0) {
      return;
    }

    let frame = 0;
    const update = (): void => {
      frame = 0;
      if (activeFocusLock()) {
        return;
      }
      const viewportCentre = window.innerHeight / 2;
      let closest: HTMLElement | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const section of sections) {
        const bounds = section.getBoundingClientRect();
        const distance = Math.abs((bounds.top + bounds.bottom) / 2 - viewportCentre);
        if (distance < closestDistance) {
          closest = section;
          closestDistance = distance;
        }
      }
      const id = closest?.dataset.hotspot;
      if (id) {
        useHotspotStore.getState().setActiveHotspot(id);
      }
    };
    const schedule = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    for (const section of document.querySelectorAll('[data-hotspot].is-active')) {
      section.classList.remove('is-active');
    }
    if (!activeHotspot) {
      return;
    }
    const section = document.querySelector(`[data-hotspot="${activeHotspot}"]`);
    section?.classList.add('is-active');
  }, [activeHotspot]);

  return null;
}
