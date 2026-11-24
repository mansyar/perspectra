import { describe, expect, it } from 'vitest';
import type { AuthPort } from '../../api/src/lib/auth';
import { InMemoryKv } from '../../api/src/lib/kv';
import type { LlmPort } from '../../api/src/lib/llm';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';
import { quizRoutes, type QuizDeps } from '../../api/src/routes/quiz';

const VALID = {
  answerIndex: 2,
  explanation: 'The aorta carries oxygenated blood from the left ventricle.',
  hotspotId: 'aorta',
  id: 'q-aorta',
  options: ['Left ventricle', 'Pulmonary artery', 'Aorta', 'Mitral valve'],
  question: 'Which vessel carries oxygenated blood to the systemic circulation?',
  remediationId: 'aorta',
};

class FakeLlm implements LlmPort {
  prompts: string[] = [];
  response: string = JSON.stringify(VALID);

  async embed(): Promise<number[][]> {
    return [];
  }

  async complete(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    return this.response;
  }
}

function authFor(userId: string | null): AuthPort {
  return {
    async getSession() {
      return userId ? { userId } : null;
    },
    async handler() {
      return new Response(null, { status: 501 });
    },
  };
}

function depsFor(
  llm: FakeLlm,
  userId: string | null,
  kv = new InMemoryKv(),
): QuizDeps & { kv: InMemoryKv } {
  return {
    auth: authFor(userId),
    db: new InMemoryProgressRepository(),
    kv,
    llm,
    secret: 'unit-test-secret',
  };
}

function post(
  app: ReturnType<typeof quizRoutes>,
  path: string,
  body: unknown,
  headers?: HeadersInit,
) {
  return Promise.resolve(
    app.request(path, {
      headers: { 'content-type': 'application/json', ...headers },
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

describe('quiz generation', () => {
  it('builds a prompt restricted to the target hotspot prose', async () => {
    const llm = new FakeLlm();
    const app = quizRoutes(depsFor(llm, 'user-1'));
    const response = await post(app, '/generate', { hotspotId: 'aorta', lessonId: 'heart' });
    expect(response.status).toBe(200);
    expect(llm.prompts[0]).toContain('largest artery in the body');
    expect(llm.prompts[0]).toContain('Target hotspot: aorta');
  });

  it('rejects malformed LLM JSON with a safe 502', async () => {
    const llm = new FakeLlm();
    llm.response = '{"definitely":"not a quiz"}';
    const app = quizRoutes(depsFor(llm, 'user-1'));
    const response = await post(app, '/generate', { lessonId: 'heart' });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: 'generation_failed' });
  });

  it('requires a session', async () => {
    const app = quizRoutes(depsFor(new FakeLlm(), null));
    const response = await post(app, '/generate', { lessonId: 'heart' });
    expect(response.status).toBe(401);
  });

  it('never returns answerIndex in the generated question', async () => {
    const app = quizRoutes(depsFor(new FakeLlm(), 'user-1'));
    const response = await post(app, '/generate', { lessonId: 'heart' });
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('answerIndex');
    expect(body).not.toHaveProperty('explanation');
    expect(body).toMatchObject({ id: 'q-aorta', hotspotId: 'aorta' });
  });
});

describe('quiz grading', () => {
  it('rejects missing and wrong-user questions', async () => {
    const kv = new InMemoryKv();
    const owner = quizRoutes(depsFor(new FakeLlm(), 'user-1', kv));
    await post(owner, '/generate', { lessonId: 'heart' });

    const missing = await post(owner, '/grade', { answerIndex: 2, questionId: 'unknown' });
    expect(missing.status).toBe(404);

    const other = quizRoutes(depsFor(new FakeLlm(), 'user-2', kv));
    const wrongUser = await post(other, '/grade', { answerIndex: 2, questionId: 'q-aorta' });
    expect(wrongUser.status).toBe(404);
  });

  it('appends exactly one event for a correct answer and reports mastery', async () => {
    const deps = depsFor(new FakeLlm(), 'user-1');
    const app = quizRoutes(deps);
    await post(app, '/generate', { lessonId: 'heart' });
    const response = await post(app, '/grade', { answerIndex: 2, questionId: 'q-aorta' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.correct).toBe(true);
    expect(body).toHaveProperty('mastery');
    expect(body).toHaveProperty('dueCards');
    const events = await deps.db.getEvents('user-1');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      hotspotId: 'aorta',
      id: 'quiz:q-aorta:user-1',
      type: 'quiz_result',
    });

    const retry = await post(app, '/grade', { answerIndex: 2, questionId: 'q-aorta' });
    expect(retry.status).toBe(200);
    expect(await deps.db.getEvents('user-1')).toHaveLength(1);
  });

  it('appends exactly one incorrect result with remediation', async () => {
    const deps = depsFor(new FakeLlm(), 'user-1');
    const app = quizRoutes(deps);
    await post(app, '/generate', { lessonId: 'heart' });
    const response = await post(app, '/grade', { answerIndex: 0, questionId: 'q-aorta' });
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.correct).toBe(false);
    expect(body.remediationId).toBe('aorta');
    const events = await deps.db.getEvents('user-1');
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ correct: false, questionId: 'q-aorta' });
  });
});
