import { useCallback, useEffect, useState } from 'react';
import { focusHotspot } from '../../lib/hotspot-store';
import './mastery.css';

export const MASTERY_REFRESH_EVENT = 'perspectra:mastery-refresh';

interface MasteryHotspot {
  hotspotId: string;
  mastery: number;
  attempts: number;
  correct: number;
  dueAt: string | null;
}

interface MasteryResponse {
  hotspots: MasteryHotspot[];
  overall: number;
  updatedAt: number | null;
  nextHotspot: string | null;
  dueCards: string[];
}

interface MasteryPanelProps {
  lessonId: string;
  hotspots: readonly string[];
}

const apiBase = import.meta.env.PUBLIC_API_URL ?? '';

function label(id: string): string {
  return id.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function MasteryPanel({ lessonId, hotspots }: MasteryPanelProps) {
  const [view, setView] = useState<MasteryResponse | null>(null);
  const [message, setMessage] = useState('Loading mastery…');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/mastery`, { credentials: 'include' });
      if (response.status === 401) {
        setMessage('Sign in to track your mastery.');
        return;
      }
      if (!response.ok) {
        setMessage('Mastery is unavailable right now. The lesson prose is still available.');
        return;
      }
      setView((await response.json()) as MasteryResponse);
      setMessage('');
    } catch {
      setMessage('Mastery is unavailable right now. The lesson prose is still available.');
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(MASTERY_REFRESH_EVENT, load);
    return () => window.removeEventListener(MASTERY_REFRESH_EVENT, load);
  }, [load]);

  const cells: MasteryHotspot[] =
    view?.hotspots ??
    hotspots.map((hotspotId) => ({
      hotspotId,
      mastery: 0.2,
      attempts: 0,
      correct: 0,
      dueAt: null,
    }));

  return (
    <section
      className="mastery-panel"
      data-mastery=""
      aria-label="Mastery overview"
      data-lesson={lessonId}
    >
      <h2>Mastery</h2>
      {message ? <p role="status">{message}</p> : null}
      <div className="mastery-panel__grid">
        {cells.map((cell) => (
          <button
            aria-label={`${label(cell.hotspotId)}: ${Math.round(cell.mastery * 100)} percent mastery`}
            className="mastery-panel__cell"
            data-mastery={cell.mastery}
            data-mastery-hotspot={cell.hotspotId}
            key={cell.hotspotId}
            onClick={() => focusHotspot(cell.hotspotId)}
            type="button"
          >
            <span>{label(cell.hotspotId)}</span>
            <strong>{Math.round(cell.mastery * 100)}%</strong>
          </button>
        ))}
      </div>
      <p className="mastery-panel__summary">
        Overall: <strong>{view ? Math.round(view.overall * 100) : 20}%</strong>
        {' · '}
        Next: {view?.nextHotspot ? label(view.nextHotspot) : 'All mastered'}
        {' · '}
        Due cards: {view?.dueCards.length ?? 0}
      </p>
    </section>
  );
}
