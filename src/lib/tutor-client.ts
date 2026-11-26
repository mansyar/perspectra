import { ApiError } from './api-client';

const baseUrl = import.meta.env.PUBLIC_API_URL ?? '';

export interface TutorEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  citations?: string[];
  code?: string;
  message?: string;
  scopeLabel?: string;
  staticExcerpt?: string;
}

export interface TutorRequestBody {
  activeHotspot?: string | null;
  history?: { role: 'user' | 'assistant'; content: string }[];
  lessonId: string;
  question: string;
  sessionId?: string;
}

/** Cookie-based SSE client. No key or token is ever read by the browser. */
export async function streamTutor(
  body: TutorRequestBody,
  onEvent: (event: TutorEvent) => void,
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/tutor`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(`Tutor request failed with status ${response.status}`, response.status);
  }
  if (!response.body) {
    throw new ApiError('Tutor response had no stream', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (block: string): void => {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!data) {
      return;
    }
    onEvent(JSON.parse(data) as TutorEvent);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      dispatch(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    dispatch(buffer);
  }
}
