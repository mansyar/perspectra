import { useEffect, useState } from 'react';
import { focusHotspot, useHotspotStore } from '../../lib/hotspot-store';
import type { SceneManifest } from '../../lib/scene-manifest';
import { HeartScene } from './HeartScene';
import { RendererErrorBoundary } from './RendererErrorBoundary';
import { detectRendererTier, nextTier, type RendererTier } from './renderer-support';
import './scene.css';

interface SceneIslandProps {
  manifest: SceneManifest;
  modelSrc: string;
}

/** Mounts the 3D island and keeps the poster usable at every fallback tier. */
export function SceneIsland({ manifest, modelSrc }: SceneIslandProps) {
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);
  const [tier, setTier] = useState<RendererTier | 'detecting'>('detecting');
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function chooseTier(): Promise<void> {
      const detected = await detectRendererTier();
      if (detected !== 'poster') {
        try {
          const response = await fetch(modelSrc, { method: 'GET' });
          if (!response.ok) {
            return;
          }
        } catch {
          // A missing GLB is exactly the case the poster covers.
        }
      }
      if (!cancelled) {
        setTier(detected);
      }
    }
    void chooseTier();
    return () => {
      cancelled = true;
    };
  }, [modelSrc]);

  function stepDown(): void {
    setReady(false);
    setTier((current) => (current === 'detecting' ? 'poster' : (nextTier(current) ?? 'poster')));
  }

  const showPoster = tier === 'poster' || !ready;

  return (
    <div
      className="scene-island"
      data-active-hotspot={activeHotspot ?? ''}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      data-renderer={tier}
      data-scene-ready={ready ? 'true' : 'false'}
    >
      <div className="scene-island__viewport">
        <img
          alt="Scene preview"
          className="scene-island__poster"
          hidden={!showPoster}
          src={manifest.model.poster}
        />
        {(tier === 'webgpu' || tier === 'webgl') && (
          <RendererErrorBoundary onError={stepDown}>
            <HeartScene
              manifest={manifest}
              modelSrc={modelSrc}
              onReady={() => setReady(true)}
              reducedMotion={reducedMotion}
              tier={tier}
            />
          </RendererErrorBoundary>
        )}
        {tier === 'detecting' && (
          <p className="scene-island__status">Preparing interactive scene…</p>
        )}
        {tier === 'poster' && (
          <p className="scene-island__status">
            Interactive preview unavailable; the lesson text is complete below.
          </p>
        )}
      </div>
      <div aria-label="Scene landmarks" className="scene-island__hotspots" role="group">
        {manifest.hotspots.map((hotspot) => (
          <button
            aria-pressed={activeHotspot === hotspot.id}
            className="scene-island__hotspot"
            data-hotspot-button={hotspot.id}
            key={hotspot.id}
            onClick={() => focusHotspot(hotspot.id)}
            type="button"
          >
            {hotspot.label}
          </button>
        ))}
      </div>
    </div>
  );
}
