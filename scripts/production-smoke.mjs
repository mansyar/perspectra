import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LESSONS = {
  heart: {
    hotspots: [
      'left_ventricle',
      'right_ventricle',
      'aorta',
      'pulmonary_artery',
      'mitral_valve',
      'aortic_valve',
    ],
    id: 'heart',
    path: '/lessons/heart/',
    title: 'The Human Heart',
    tutorHotspot: 'aorta',
    tutorQuestion: 'What is the function of the aorta in the cardiovascular system?',
  },
  'earth-interior': {
    hotspots: ['crust', 'upper_mantle', 'lower_mantle', 'outer_core', 'inner_core', 'lithosphere'],
    id: 'earth-interior',
    path: '/lessons/earth-interior/',
    title: 'Inside Earth',
    tutorHotspot: 'outer_core',
    tutorQuestion: 'What is the outer core made of and where is it inside Earth?',
  },
};

const EVIDENCE_ROOT = fileURLToPath(new URL('../.conductor/evidence/', import.meta.url));
const DEFAULT_TIMEOUT_MS = 30_000;
const TUTOR_TIMEOUT_MS = 90_000;

class SmokeFailure extends Error {
  constructor(message) {
    super(message);
    this.name = 'SmokeFailure';
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new SmokeFailure(message);
  }
}

function publicOrigin(value) {
  const message =
    'E2E_BASE_URL must be an absolute http(s) origin with no path, query, fragment, or credentials.';
  assert(typeof value === 'string' && value.trim() === value && value.length > 0, message);
  assert(/^https?:\/\//i.test(value) && !value.includes('?') && !value.includes('#'), message);
  const authority = /^https?:\/\/([^/?#\\]+)\/?$/i.exec(value)?.[1];
  assert(authority && !authority.includes('@'), message);

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SmokeFailure(message);
  }
  assert(
    (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.pathname === '/' &&
      url.username === '' &&
      url.password === '' &&
      !url.href.includes('@'),
    message,
  );
  return url.origin;
}

function smokeOutput(value, lessonId) {
  const root = resolve(EVIDENCE_ROOT);
  const output = resolve(value ?? `${root}/production-smoke-${lessonId}.json`);
  const fromRoot = relative(root, output);
  assert(
    fromRoot !== '' && !fromRoot.startsWith('..') && !isAbsolute(fromRoot),
    'SMOKE_OUTPUT must name a file under .conductor/evidence/.',
  );
  return output;
}

function cookieJar() {
  const cookies = new Map();
  return {
    header() {
      return [...cookies.values()].join('; ');
    },
    store(response) {
      for (const header of response.headers.getSetCookie()) {
        const pair = header.split(';', 1)[0];
        const separator = pair.indexOf('=');
        if (separator < 1) {
          continue;
        }
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        if (value === '') {
          cookies.delete(name);
        } else {
          cookies.set(name, pair);
        }
      }
    },
  };
}

async function send(
  origin,
  path,
  { body, cookies, method = 'GET', timeout = DEFAULT_TIMEOUT_MS } = {},
) {
  const headers = { origin };
  const cookie = cookies?.header();
  if (cookie) {
    headers.cookie = cookie;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(new URL(path, origin), {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
      method,
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new SmokeFailure(`${path} request failed or timed out`);
  }
  cookies?.store(response);
  return response;
}

async function jsonResponse(response, label, status = 200) {
  assert(response.status === status, `${label} returned HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new SmokeFailure(`${label} did not return JSON`);
  }
}

async function check(checks, name, operation) {
  const started = Date.now();
  try {
    const details = await operation();
    checks.push({ durationMs: Date.now() - started, name, status: 'passed', ...details });
    process.stdout.write(`PASS ${name}\n`);
    return details;
  } catch (error) {
    const message = error instanceof SmokeFailure ? error.message : 'unexpected failure';
    checks.push({ durationMs: Date.now() - started, error: message, name, status: 'failed' });
    throw error instanceof SmokeFailure ? error : new SmokeFailure(message);
  }
}

function parseTutorStream(text) {
  let answer = '';
  const citations = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) {
      continue;
    }
    let event;
    try {
      event = JSON.parse(line.slice(5).trim());
    } catch {
      throw new SmokeFailure('tutor returned malformed SSE');
    }
    if (event.type === 'error') {
      throw new SmokeFailure(`tutor returned ${event.code ?? 'an error event'}`);
    }
    if (event.type === 'delta' && typeof event.text === 'string') {
      answer += event.text;
    }
    if (event.type === 'done' && Array.isArray(event.citations)) {
      citations.push(...event.citations);
    }
  }
  return { answer, citations };
}

function sameHotspots(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((hotspotId, index) => hotspotId === expected[index])
  );
}

async function runSmoke(origin, lesson, checks) {
  const cookies = cookieJar();
  let question;
  let citationCount = 0;
  let minimumMastery = 0;

  await check(checks, 'health', async () => {
    const health = await jsonResponse(await send(origin, '/health', { cookies }), 'health');
    assert(
      health.status === 'ok' && health.service === 'perspectra-api',
      'health payload mismatch',
    );
    return {};
  });

  await check(checks, 'catalog', async () => {
    const response = await send(origin, '/', { cookies });
    assert(response.status === 200, 'catalog returned a non-200 response');
    const html = await response.text();
    for (const item of Object.values(LESSONS)) {
      assert(html.includes(`href="/lessons/${item.id}"`), `catalog is missing ${item.id}`);
      assert(html.includes(item.title), `catalog is missing the ${item.id} title`);
    }
    return {};
  });

  await check(checks, 'lesson page', async () => {
    const response = await send(origin, lesson.path, { cookies });
    assert(response.status === 200, 'lesson page returned a non-200 response');
    const html = await response.text();
    assert(html.includes(lesson.title), 'lesson title mismatch');
    for (const hotspotId of lesson.hotspots) {
      assert(html.includes(`href="#${hotspotId}"`), `lesson is missing landmark ${hotspotId}`);
      assert(html.includes(`data-hotspot="${hotspotId}"`), `lesson is missing prose ${hotspotId}`);
    }
    return { hotspots: lesson.hotspots.length };
  });

  const email = `production-smoke-${randomUUID()}@example.com`;
  const password = randomUUID();
  await check(checks, 'unique-email sign-up', async () => {
    await jsonResponse(
      await send(origin, '/api/auth/sign-up/email', {
        body: { email, name: 'Production smoke', password },
        cookies,
        method: 'POST',
      }),
      'sign-up',
    );
    return {};
  });

  await check(checks, 'sign-out', async () => {
    await jsonResponse(
      await send(origin, '/api/auth/sign-out', { cookies, method: 'POST' }),
      'sign-out',
    );
    return {};
  });

  await check(checks, 'unique-email sign-in', async () => {
    await jsonResponse(
      await send(origin, '/api/auth/sign-in/email', {
        body: { email, password },
        cookies,
        method: 'POST',
      }),
      'sign-in',
    );
    return {};
  });

  await check(checks, 'authenticated progress read', async () => {
    const progress = await jsonResponse(
      await send(origin, '/api/progress', { cookies }),
      'progress read',
    );
    assert(
      progress.eventCount === 0 && progress.lessons.length === 0,
      'new smoke user already has progress',
    );
    return {};
  });

  await check(checks, 'grounded SSE tutor', async () => {
    const response = await send(origin, '/api/tutor', {
      body: {
        activeHotspot: lesson.tutorHotspot,
        lessonId: lesson.id,
        question: lesson.tutorQuestion,
      },
      cookies,
      method: 'POST',
      timeout: TUTOR_TIMEOUT_MS,
    });
    assert(response.status === 200, 'tutor returned a non-200 response');
    assert(
      (response.headers.get('content-type') ?? '').includes('text/event-stream'),
      'tutor did not return SSE',
    );
    const { answer, citations } = parseTutorStream(await response.text());
    assert(answer.trim().length > 20, 'tutor returned no substantive answer');
    assert(citations.length > 0, 'tutor returned no citations');
    assert(
      citations.every((citation) => {
        const [lessonId, hotspotId, layer] = String(citation).split(':');
        return lessonId === lesson.id && lesson.hotspots.includes(hotspotId) && Boolean(layer);
      }),
      'tutor returned an invalid lesson citation',
    );
    citationCount = citations.length;
    return { citations: citationCount };
  });

  await check(checks, 'quiz generation', async () => {
    question = await jsonResponse(
      await send(origin, '/api/quiz/generate', {
        body: { hotspotId: lesson.tutorHotspot, lessonId: lesson.id },
        cookies,
        method: 'POST',
      }),
      'quiz generation',
    );
    assert(question.lessonId === lesson.id, 'quiz lesson scope mismatch');
    assert(lesson.hotspots.includes(question.hotspotId), 'quiz hotspot is outside the lesson');
    assert(
      lesson.hotspots.includes(question.remediationId),
      'quiz remediation is outside the lesson',
    );
    assert(
      Array.isArray(question.options) && question.options.length === 4,
      'quiz did not return four options',
    );
    assert(
      typeof question.question === 'string' && question.question.length > 0,
      'quiz question is empty',
    );
    return { hotspotId: question.hotspotId };
  });

  await check(checks, 'quiz grading', async () => {
    const graded = await jsonResponse(
      await send(origin, '/api/quiz/grade', {
        body: { answerIndex: 0, questionId: question.id },
        cookies,
        method: 'POST',
      }),
      'quiz grading',
    );
    assert(typeof graded.correct === 'boolean', 'quiz grade is missing');
    assert(
      sameHotspots(
        graded.mastery?.hotspots?.map((item) => item.hotspotId),
        lesson.hotspots,
      ),
      'graded mastery is not lesson-scoped',
    );
    assert(
      typeof graded.explanation === 'string' && graded.explanation.length > 0,
      'quiz explanation is empty',
    );
    return { correct: graded.correct };
  });

  const masteredEvents = lesson.hotspots.flatMap((hotspotId, hotspotIndex) =>
    [0, 1].map((attempt) => ({
      hotspotId,
      id: randomUUID(),
      lessonId: lesson.id,
      payload: { correct: true, source: 'production-smoke' },
      timestamp: Date.now() + 1_000 + hotspotIndex * 100 + attempt,
      type: 'quiz_result',
    })),
  );
  const batch = { events: masteredEvents };

  await check(checks, 'additive progress sync', async () => {
    const synced = await jsonResponse(
      await send(origin, '/api/progress/sync', { body: batch, cookies, method: 'POST' }),
      'progress sync',
    );
    assert(
      synced.applied === masteredEvents.length && synced.duplicates === 0,
      'progress sync did not apply every event',
    );
    return { applied: synced.applied };
  });

  await check(checks, 'idempotent progress replay', async () => {
    const replayed = await jsonResponse(
      await send(origin, '/api/progress/sync', { body: batch, cookies, method: 'POST' }),
      'progress replay',
    );
    assert(
      replayed.applied === 0 && replayed.duplicates === masteredEvents.length,
      'progress replay duplicated events',
    );
    return { duplicates: replayed.duplicates };
  });

  await check(checks, 'progress read after sync', async () => {
    const progress = await jsonResponse(
      await send(origin, '/api/progress', { cookies }),
      'progress read after sync',
    );
    assert(progress.eventCount === masteredEvents.length + 1, 'progress event count mismatch');
    const lessonProgress = progress.lessons.find((item) => item.lessonId === lesson.id);
    assert(
      lessonProgress?.hotspots.length === lesson.hotspots.length,
      'synced progress is not lesson-scoped',
    );
    return { eventCount: progress.eventCount, hotspots: lessonProgress.hotspots.length };
  });

  await check(checks, 'mastery threshold', async () => {
    const mastery = await jsonResponse(
      await send(origin, `/api/mastery?lessonId=${encodeURIComponent(lesson.id)}`, { cookies }),
      'mastery',
    );
    assert(
      sameHotspots(
        mastery.hotspots?.map((item) => item.hotspotId),
        lesson.hotspots,
      ),
      'mastery vocabulary is not lesson-scoped',
    );
    assert(
      mastery.hotspots.every((item) => item.mastery >= 0.85 && item.attempts >= 2),
      'not every hotspot reached the mastery threshold',
    );
    minimumMastery = Math.min(...mastery.hotspots.map((item) => item.mastery));
    return { minimumMastery };
  });

  let credential;
  await check(checks, 'badge issuance and verification', async () => {
    const issued = await jsonResponse(
      await send(origin, '/api/badge/issue', {
        body: { lessonId: lesson.id },
        cookies,
        method: 'POST',
      }),
      'badge issuance',
    );
    credential = issued.credential;
    assert(typeof credential === 'string' && credential.length > 0, 'badge credential is empty');
    const verified = await jsonResponse(
      await send(origin, '/api/badge/verify', {
        body: { credential },
        cookies,
        method: 'POST',
      }),
      'badge verification',
    );
    assert(verified.valid === true, 'issued badge did not verify');
    const expectedName = lesson.id === 'heart' ? 'Human Heart Mastery' : 'Inside Earth Mastery';
    assert(
      verified.credential?.credentialSubject?.achievement?.name === expectedName,
      'badge achievement name mismatch',
    );
    return {};
  });

  await check(checks, 'badge tamper rejection', async () => {
    const finalCharacter = credential.at(-1);
    const tampered = `${credential.slice(0, -1)}${finalCharacter === 'a' ? 'b' : 'a'}`;
    const rejected = await jsonResponse(
      await send(origin, '/api/badge/verify', {
        body: { credential: tampered },
        cookies,
        method: 'POST',
      }),
      'tampered badge verification',
    );
    assert(rejected.valid === false, 'tampered badge was accepted');
    return {};
  });

  return { citationCount, hotspots: lesson.hotspots.length, minimumMastery };
}

function invokedDirectly() {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  const lessonId = process.argv[2] ?? 'heart';
  let output;
  let origin;
  try {
    assert(Object.hasOwn(LESSONS, lessonId), 'lesson ID must be heart or earth-interior');
    origin = publicOrigin(process.env.E2E_BASE_URL);
    output = smokeOutput(process.env.SMOKE_OUTPUT, lessonId);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Invalid smoke configuration'}\n`,
    );
    process.exitCode = 1;
  }

  if (origin && output) {
    const started = Date.now();
    const checks = [];
    let metrics = {};
    let status = 'passed';
    try {
      metrics = await runSmoke(origin, LESSONS[lessonId], checks);
    } catch {
      status = 'failed';
      process.exitCode = 1;
    }
    const summary = {
      checks,
      durationMs: Date.now() - started,
      finishedAt: new Date().toISOString(),
      lessonId,
      metrics,
      origin,
      startedAt: new Date(started).toISOString(),
      status,
    };
    try {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(summary, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
      process.stdout.write(`Production smoke ${status}: ${output}\n`);
    } catch {
      process.stderr.write('Unable to write the production smoke evidence file.\n');
      process.exitCode = 1;
    }
  }
}
