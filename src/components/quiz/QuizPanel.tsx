import { useEffect, useState } from 'react';
import { MASTERY_REFRESH_EVENT } from '../mastery/MasteryPanel';
import { focusHotspot, useHotspotStore } from '../../lib/hotspot-store';
import './quiz.css';

interface QuizQuestion {
  hotspotId: string;
  id: string;
  lessonId: string;
  options: string[];
  question: string;
  remediationId: string;
}

interface GradeResult {
  correct: boolean;
  dueCards: string[];
  explanation: string;
  nextHotspot: string | null;
  remediationId: string;
}

interface QuizPanelProps {
  lessonId: string;
}

const apiBase = import.meta.env.PUBLIC_API_URL ?? '';

export function QuizPanel({ lessonId }: QuizPanelProps) {
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function generate(): Promise<void> {
    setBusy(true);
    setMessage('');
    setResult(null);
    setQuestion(null);
    setSelected(null);
    try {
      const response = await fetch(`${apiBase}/api/quiz/generate`, {
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          hotspotId: activeHotspot ?? undefined,
          lessonId,
        }),
      });
      if (response.status === 401) {
        setMessage('Sign in to check your understanding.');
        return;
      }
      if (!response.ok) {
        setMessage('A question could not be generated. Please try again.');
        return;
      }
      setQuestion((await response.json()) as QuizQuestion);
    } catch {
      setMessage('The quiz is unavailable right now. The lesson prose is still available.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    if (!question || selected === null) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/api/quiz/grade`, {
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ answerIndex: selected, questionId: question.id }),
      });
      if (response.status === 401) {
        setMessage('Sign in to check your understanding.');
        return;
      }
      if (!response.ok) {
        setMessage('Your answer could not be graded. Please try again.');
        return;
      }
      setResult((await response.json()) as GradeResult);
      window.dispatchEvent(new Event(MASTERY_REFRESH_EVENT));
    } catch {
      setMessage('The quiz is unavailable right now. The lesson prose is still available.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Check your understanding"
      className="quiz-panel"
      data-quiz-hydrated={hydrated ? 'true' : 'false'}
    >
      <h2>Check your understanding</h2>
      <button
        data-testid="quiz-generate"
        disabled={busy || !hydrated}
        onClick={() => void generate()}
        type="button"
      >
        {question ? 'New question' : 'Check understanding'}
      </button>
      {message ? <p role="status">{message}</p> : null}
      {question ? (
        <fieldset className="quiz-panel__question" disabled={busy}>
          <legend>{question.question}</legend>
          {question.options.map((option, index) => (
            <label key={`${question.id}:${index}`}>
              <input
                checked={selected === index}
                data-testid="quiz-option"
                name="quiz-answer"
                onChange={() => setSelected(index)}
                type="radio"
                value={index}
              />
              {option}
            </label>
          ))}
        </fieldset>
      ) : null}
      {question ? (
        <button
          data-testid="quiz-submit"
          disabled={busy || selected === null}
          onClick={() => void submit()}
          type="button"
        >
          Submit answer
        </button>
      ) : null}
      {result ? (
        <div className="quiz-panel__result" data-testid="quiz-result" role="status">
          <p>{result.correct ? 'Correct.' : 'Not quite.'}</p>
          <p>{result.explanation}</p>
          <button
            data-hotspot-remediation={result.remediationId}
            onClick={() => focusHotspot(result.remediationId)}
            type="button"
          >
            Review {result.remediationId.replaceAll('_', ' ')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
