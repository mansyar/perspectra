import { describe, expect, it } from 'vitest';
import type { AuthPort } from '../../api/src/lib/auth';
import { InMemoryKv } from '../../api/src/lib/kv';
import type { LlmPort } from '../../api/src/lib/llm';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';
import { masteryRoutes, quizRoutes, type QuizDeps } from '../../api/src/routes/quiz';
import { EARTH_LESSON } from '../fixtures/lessons';

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

  it('uses the injected chunk source instead of the hardcoded mirror', async () => {
    const llm = new FakeLlm();
    const deps = depsFor(llm, 'user-1');
    deps.getChunks = (lessonId, _hotspots) =>
      lessonId === 'brain'
        ? [
            {
              hotspotId: 'cortex',
              id: 'brain:cortex:overview',
              layer: 'overview',
              lessonId: 'brain',
              text: 'The cortex folds into gyri to increase surface area.',
            },
          ]
        : [];
    llm.response = JSON.stringify({ ...VALID, hotspotId: 'cortex', remediationId: 'cortex' });
    const app = quizRoutes(deps);
    const response = await post(app, '/generate', { hotspotId: 'cortex', lessonId: 'brain' });
    expect(response.status).toBe(200);
    expect(llm.prompts[0]).toContain('The cortex folds into gyri');
    expect(llm.prompts[0]).not.toContain('largest artery in the body');
  });

  it('generates for a second lesson whose hotspot IDs are not heart landmarks', async () => {
    const llm = new FakeLlm();
    llm.response = JSON.stringify({
      ...VALID,
      hotspotId: 'planet_core',
      id: 'q-planet-core',
      remediationId: 'planet_core',
    });
    const deps = depsFor(llm, 'user-1');
    deps.getChunks = (lessonId, _hotspots) =>
      lessonId === 'planets'
        ? [
            {
              hotspotId: 'planet_core',
              id: 'planets:planet_core:overview',
              layer: 'overview',
              lessonId: 'planets',
              text: 'The planet core is dense and hot.',
            },
          ]
        : [];
    const app = quizRoutes(deps);
    const response = await post(app, '/generate', {
      hotspotId: 'planet_core',
      lessonId: 'planets',
    });
    expect(response.status).toBe(200);
    expect(llm.prompts[0]).toContain('planet_core');
    expect(llm.prompts[0]).toContain('The planet core is dense and hot.');
    expect(await response.json()).toMatchObject({ hotspotId: 'planet_core' });
  });

  it('generates, grades and schedules Earth review from Earth chunks', async () => {
    const llm = new FakeLlm();
    llm.response = JSON.stringify({
      answerIndex: 1,
      explanation: 'The liquid outer core is mainly iron and nickel.',
      hotspotId: 'outer_core',
      id: 'q-outer-core',
      options: ['Solid rock', 'Liquid iron and nickel', 'Water', 'Silicate minerals'],
      question: 'What makes up the outer core?',
      remediationId: 'outer_core',
    });
    const deps = depsFor(llm, 'user-earth');
    deps.getChunks = (lessonId) =>
      lessonId === EARTH_LESSON.id
        ? EARTH_LESSON.hotspots.map((hotspotId) => ({
            hotspotId,
            id: `${lessonId}:${hotspotId}:overview`,
            layer: 'overview',
            lessonId,
            text:
              hotspotId === 'outer_core'
                ? 'The outer core is liquid iron and nickel.'
                : `The ${hotspotId} is a layer or region inside Earth.`,
          }))
        : [];
    const app = quizRoutes(deps);
    const generated = await post(app, '/generate', {
      hotspotId: 'outer_core',
      lessonId: EARTH_LESSON.id,
    });
    expect(generated.status).toBe(200);
    expect(llm.prompts[0]).toContain('The outer core is liquid iron and nickel.');
    expect(llm.prompts[0]).not.toMatch(/heart|aorta|anatomy|clinical/i);

    const graded = await post(app, '/grade', { answerIndex: 0, questionId: 'q-outer-core' });
    expect(graded.status).toBe(200);
    const result = (await graded.json()) as {
      correct: boolean;
      mastery: {
        dueCards: string[];
        hotspots: { hotspotId: string }[];
      };
      nextHotspot: string | null;
      remediationId: string;
    };
    expect(result).toMatchObject({ correct: false, remediationId: 'outer_core' });
    expect(result.mastery.hotspots.map((hotspot) => hotspot.hotspotId)).toEqual(
      EARTH_LESSON.hotspots,
    );
    expect(result.mastery.dueCards).toContain('outer_core');
    expect(EARTH_LESSON.hotspots).toContain(result.nextHotspot ?? '');
    const events = await deps.db.getEvents('user-earth');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      hotspotId: 'outer_core',
      lessonId: EARTH_LESSON.id,
      payload: { correct: false },
      type: 'quiz_result',
    });

    const mastery = await Promise.resolve(
      masteryRoutes(deps).request(`/?lessonId=${EARTH_LESSON.id}`),
    );
    expect(mastery.status).toBe(200);
    const view = (await mastery.json()) as { hotspots: { hotspotId: string }[] };
    expect(view.hotspots.map((hotspot) => hotspot.hotspotId)).toEqual(EARTH_LESSON.hotspots);
  });

  it('does not substitute heart vocabulary when Earth chunks are unavailable', async () => {
    const llm = new FakeLlm();
    const deps = depsFor(llm, 'user-earth');
    deps.getChunks = () => [];
    const generated = await post(quizRoutes(deps), '/generate', {
      hotspotId: 'outer_core',
      lessonId: EARTH_LESSON.id,
    });
    expect(generated.status).toBe(400);
    expect(llm.prompts).toHaveLength(0);

    const mastery = await Promise.resolve(
      masteryRoutes(deps).request(`/?lessonId=${EARTH_LESSON.id}`),
    );
    expect(await mastery.json()).toMatchObject({ dueCards: [], hotspots: [], nextHotspot: null });
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

describe('mastery route', () => {
  it('reports the vocabulary of the requested lesson instead of heart landmarks', async () => {
    const deps = depsFor(new FakeLlm(), 'user-1');
    deps.getChunks = (lessonId) =>
      lessonId === 'planets'
        ? [
            {
              hotspotId: 'planet_core',
              id: 'planets:planet_core:overview',
              layer: 'overview',
              lessonId: 'planets',
              text: 'The planet core is dense and hot.',
            },
          ]
        : [];
    const app = masteryRoutes(deps);
    const response = await Promise.resolve(app.request('/?lessonId=planets'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      hotspots: { hotspotId: string }[];
      nextHotspot: string | null;
    };
    expect(body.hotspots.map((hotspot) => hotspot.hotspotId)).toEqual(['planet_core']);
    expect(body.nextHotspot).toBe('planet_core');
  });
});
