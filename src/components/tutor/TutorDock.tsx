import { useEffect, useRef, useState } from 'react';
import { focusHotspot, useHotspotStore } from '../../lib/hotspot-store';
import { streamTutor, type TutorEvent } from '../../lib/tutor-client';
import './tutor.css';

interface TutorDockProps {
  lessonId: string;
  hotspots: readonly string[];
}

interface TutorError {
  code: string;
  message: string;
  staticExcerpt: string;
}

const PROMPTS = [
  'What is the main idea here?',
  'How does this fit into the lesson?',
  'Why is this important?',
];

function label(id: string): string {
  return id.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function hotspotFromCitation(citation: string, hotspots: readonly string[]): string {
  const known = hotspots.find((id) => citation === id || citation.endsWith(`:${id}:`));
  return known ?? citation.split(':')[1] ?? citation;
}

/** Right-dock tutor. The lesson prose is always independent of this island. */
export function TutorDock({ lessonId, hotspots }: TutorDockProps) {
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);
  const sessionId = useRef(crypto.randomUUID());
  const [hydrated, setHydrated] = useState(false);
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<string[]>([]);
  const [error, setError] = useState<TutorError | null>(null);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [streaming, setStreaming] = useState(false);

  useEffect(() => setHydrated(true), []);

  async function ask(text: string, hotspot: string | null = activeHotspot): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || streaming) {
      return;
    }
    setStreaming(true);
    setAnswer('');
    setCitations([]);
    setError(null);
    let failed = false;
    let answerText = '';

    const handleEvent = (event: TutorEvent): void => {
      if (event.type === 'delta') {
        answerText += event.text ?? '';
        setAnswer(answerText);
      } else if (event.type === 'done') {
        setCitations(event.citations ?? []);
      } else {
        failed = true;
        setError({
          code: event.code ?? 'error',
          message: event.message ?? 'The tutor could not answer that question.',
          staticExcerpt: event.staticExcerpt ?? '',
        });
      }
    };

    try {
      await streamTutor(
        {
          activeHotspot: hotspot,
          history: history.slice(-16),
          lessonId,
          question: trimmed,
          sessionId: sessionId.current,
        },
        handleEvent,
      );
      if (!failed) {
        setHistory([
          ...history.slice(-15),
          { content: trimmed, role: 'user' },
          { content: answerText, role: 'assistant' },
        ]);
      }
    } catch {
      failed = true;
      setError({
        code: 'network',
        message: 'The tutor could not be reached. The lesson prose is still available.',
        staticExcerpt: '',
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <aside
      className="tutor"
      aria-label="Course tutor"
      data-tutor-hydrated={hydrated ? 'true' : 'false'}
    >
      <div className="tutor__head">
        <h2>Ask the tutor</h2>
        <p className="tutor__disclosure" data-testid="tutor-disclosure">
          AI-generated answers. Always check the cited lesson prose; the tutor can be wrong.
        </p>
        <p className="tutor__privacy" data-testid="tutor-privacy">
          Privacy: questions are sent to the tutor service and stored with your session. Do not
          enter personal or sensitive information.
        </p>
      </div>

      <div className="tutor__chips" aria-label="Suggested hotspots">
        {hotspots.map((id) => (
          <button
            className="tutor__chip"
            data-hotspot-chip={id}
            disabled={streaming || !hydrated}
            key={id}
            onClick={() => void ask(`Explain ${label(id)}.`, id)}
            type="button"
          >
            {label(id)}
          </button>
        ))}
      </div>

      {activeHotspot && (
        <p className="tutor__context">
          Context: <strong>{label(activeHotspot)}</strong>
        </p>
      )}

      <form
        className="tutor__form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
          setQuestion('');
        }}
      >
        <label className="tutor__label" htmlFor="tutor-question">
          Your question
        </label>
        <textarea
          id="tutor-question"
          maxLength={1000}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={PROMPTS[0]}
          rows={3}
          value={question}
        />
        <button
          className="tutor__send"
          disabled={streaming || !hydrated || !question.trim()}
          type="submit"
        >
          {streaming ? 'Answering…' : 'Ask'}
        </button>
      </form>

      <div aria-live="polite" className="tutor__answer" data-testid="tutor-answer">
        {answer && (
          <p>
            {answer.split(/(\[\[[a-zA-Z0-9:_-]+\]\])/g).map((piece, index) => {
              const citation = /^\[\[([a-zA-Z0-9:_-]+)\]\]$/.exec(piece);
              if (!citation) {
                return <span key={index}>{piece}</span>;
              }
              const hotspot = hotspotFromCitation(citation[1], hotspots);
              return (
                <button
                  className="tutor__citation"
                  data-citation={citation[1]}
                  key={index}
                  onClick={() => focusHotspot(hotspot)}
                  type="button"
                >
                  {label(hotspot)}
                </button>
              );
            })}
          </p>
        )}
        {citations.length > 0 && (
          <p className="tutor__sources">
            Sources:{' '}
            {citations.map((citation, index) => (
              <button
                className="tutor__citation"
                data-citation={citation}
                key={`${citation}-${index}`}
                onClick={() => focusHotspot(hotspotFromCitation(citation, hotspots))}
                type="button"
              >
                {label(hotspotFromCitation(citation, hotspots))}
              </button>
            ))}
          </p>
        )}
        {error && (
          <div className="tutor__error" role="status">
            <p>{error.message}</p>
            {error.staticExcerpt && <blockquote>{error.staticExcerpt}</blockquote>}
          </div>
        )}
      </div>
    </aside>
  );
}
