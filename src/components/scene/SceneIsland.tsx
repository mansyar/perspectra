import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { focusHotspot, useHotspotStore } from '../../lib/hotspot-store';
import type { SceneManifest } from '../../lib/scene-manifest';
import { RendererErrorBoundary } from './RendererErrorBoundary';
import { detectRendererTier, nextTier, type RendererTier } from './renderer-support';
import './scene.css';

/** Heavy 3D code is loaded only when the learner opts into the interactive view. */
const HeartScene = lazy(async () => {
  const module = await import('./HeartScene');
  return { default: module.HeartScene };
});

interface SceneIslandProps {
  manifest: SceneManifest;
  modelSrc: string;
}

/**
 * Mounts the 3D island and keeps the poster usable at every fallback tier.
 * `?rendererErrors=N` is a QA hook that makes the first N mount attempts throw,
 * so the WebGPU→WebGL→poster ladder can be exercised deterministically in E2E.
 */
export function SceneIsland({ manifest, modelSrc }: SceneIslandProps) {
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);
  const [tier, setTier] = useState<RendererTier | 'detecting'>('detecting');
  const [ready, setReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const forcedFailures = (() => {
    if (typeof window === 'undefined') {
      return 0;
    }
    const raw = new URLSearchParams(window.location.search).get('rendererErrors');
    const parsed = Number.parseInt(raw ?? '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();

  const handleReady = useCallback(() => setReady(true), []);

  useEffect(() => setHydrated(true), []);

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
            if (!cancelled) {
              setTier('poster');
            }
            return;
          }
        } catch {
          // A missing GLB is exactly the case the poster covers.
          if (!cancelled) {
            setTier('poster');
          }
          return;
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
    const next = tier === 'detecting' ? 'poster' : (nextTier(tier) ?? 'poster');
    setReady(false);
    setAttempt((current) => current + 1);
    setNotice(
      next === 'poster'
        ? 'Interactive 3D is unavailable. The complete lesson text remains below.'
        : `${tier} rendering failed. Retrying with ${next}.`,
    );
    setTier(next);
  }

  function usePoster(): void {
    setInteractive(false);
    setReady(false);
    setTier('poster');
    setNotice('Interactive 3D is unavailable. The complete lesson text remains below.');
  }

  const showPoster = tier === 'poster' || !ready;

  return (
    <div
      className="scene-island"
      data-active-hotspot={activeHotspot ?? ''}
      data-scene-hydrated={hydrated ? 'true' : 'false'}
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
        {(tier === 'webgpu' || tier === 'webgl') && !interactive && (
          <button
            className="scene-island__start"
            onClick={() => setInteractive(true)}
            type="button"
          >
            Start interactive 3D view
          </button>
        )}
        {interactive && (tier === 'webgpu' || tier === 'webgl') && (
          <Suspense fallback={null}>
            <RendererErrorBoundary key={`${tier}:${attempt}`} onError={stepDown}>
              <HeartScene
                failRender={attempt < forcedFailures}
                manifest={manifest}
                modelSrc={modelSrc}
                onReady={handleReady}
                reducedMotion={reducedMotion}
                tier={tier}
              />
            </RendererErrorBoundary>
          </Suspense>
        )}
        {tier === 'detecting' && (
          <p className="scene-island__status">Preparing interactive scene…</p>
        )}
        {notice !== null && (
          <div className="scene-island__recovery" data-testid="renderer-status" role="status">
            <p>{notice}</p>
            {tier !== 'poster' && (
              <button className="scene-island__retry" onClick={usePoster} type="button">
                Use the illustrated poster
              </button>
            )}
          </div>
        )}
        {tier === 'poster' && notice === null && (
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
