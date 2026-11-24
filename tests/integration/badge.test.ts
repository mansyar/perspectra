import { describe, expect, it } from 'vitest';
import type { AuthPort } from '../../api/src/lib/auth';
import type { LearningEvent } from '../../api/src/lib/events';
import { InMemoryKv } from '../../api/src/lib/kv';
import { InMemoryProgressRepository } from '../../api/src/lib/progress-repository';
import { DEFAULT_HOTSPOTS } from '../../api/src/lib/retrieval';
import { createApp } from '../../api/src/index';

const SECRET = 'integration-test-secret';

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

function masteredEvents(userId: string): LearningEvent[] {
  return DEFAULT_HOTSPOTS.flatMap((hotspotId, index) =>
    [0, 1].map((attempt) => ({
      hotspotId,
      id: `${userId}:${hotspotId}:${attempt}`,
      lessonId: 'heart',
      payload: { correct: true },
      timestamp: 1_700_000_000_000 + index * 1000 + attempt,
      type: 'quiz_result' as const,
    })),
  );
}

function appFor(db: InMemoryProgressRepository, userId: string | null) {
  return createApp({ auth: authFor(userId), db, kv: new InMemoryKv() });
}

function request(app: ReturnType<typeof createApp>, path: string, body: unknown) {
  return Promise.resolve(
    app.request(
      path,
      {
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(body),
      },
      { BETTER_AUTH_SECRET: SECRET },
    ),
  );
}

describe('badge routes', () => {
  it('issues, verifies and rejects tampered credentials', async () => {
    const db = new InMemoryProgressRepository();
    await db.appendEvents('learner', masteredEvents('learner'));
    const app = appFor(db, 'learner');

    const issued = await request(app, '/api/badge/issue', {});
    expect(issued.status).toBe(200);
    const { credential } = (await issued.json()) as { credential: string };

    const verified = await request(app, '/api/badge/verify', { credential });
    expect(verified.status).toBe(200);
    expect((await verified.json()) as { valid: boolean }).toMatchObject({ valid: true });

    const [payload, signature] = credential.split('.');
    const position = 8;
    const tampered =
      payload.slice(0, position) +
      (payload[position] === 'A' ? 'B' : 'A') +
      payload.slice(position + 1);
    const rejected = await request(app, '/api/badge/verify', {
      credential: `${tampered}.${signature}`,
    });
    expect((await rejected.json()) as { valid: boolean }).toMatchObject({ valid: false });
  });

  it('blocks issuance for a learner who has not mastered all six hotspots', async () => {
    const db = new InMemoryProgressRepository();
    await db.appendEvents('learner', masteredEvents('learner'));
    const app = appFor(db, 'newcomer');
    const response = await request(app, '/api/badge/issue', {});
    expect(response.status).toBe(403);
    const body = (await response.json()) as { failing: string[] };
    expect(body.failing).toHaveLength(6);
  });

  it('requires a session for issuance but not for verification', async () => {
    const db = new InMemoryProgressRepository();
    await db.appendEvents('learner', masteredEvents('learner'));
    const app = appFor(db, null);
    const issue = await request(app, '/api/badge/issue', {});
    expect(issue.status).toBe(401);
    const verify = await request(app, '/api/badge/verify', { credential: 'not-a-credential' });
    expect(verify.status).toBe(200);
    expect((await verify.json()) as { valid: boolean }).toMatchObject({ valid: false });
  });

  it('uses a non-heart lesson vocabulary for mastery and the credential', async () => {
    const hotspots = ['cortex', 'hippocampus'];
    const db = new InMemoryProgressRepository();
    await db.appendEvents(
      'learner',
      hotspots.flatMap((hotspotId, index) =>
        [0, 1].map((attempt) => ({
          hotspotId,
          id: `learner:${hotspotId}:${attempt}`,
          lessonId: 'brain',
          payload: { correct: true },
          timestamp: 1_700_000_000_000 + index * 1000 + attempt,
          type: 'quiz_result' as const,
        })),
      ),
    );
    const app = createApp({
      auth: authFor('learner'),
      db,
      getChunks: (lessonId) =>
        lessonId === 'brain'
          ? hotspots.map((hotspotId) => ({
              hotspotId,
              id: `brain:${hotspotId}:overview`,
              layer: 'overview',
              lessonId,
              text: `The ${hotspotId} is part of the brain lesson.`,
            }))
          : [],
      kv: new InMemoryKv(),
    });

    const issued = await request(app, '/api/badge/issue', { lessonId: 'brain' });
    expect(issued.status).toBe(200);
    const { credential } = (await issued.json()) as { credential: string };
    const verified = await request(app, '/api/badge/verify', { credential });
    const result = (await verified.json()) as {
      credential?: {
        credentialSubject?: {
          achievement?: {
            criteria?: { narrative?: string };
            description?: string;
            id?: string;
          };
        };
      };
      valid: boolean;
    };
    expect(result.valid).toBe(true);
    const achieved = result.credential?.credentialSubject?.achievement;
    expect(achieved?.id).toContain('brain');
    expect(achieved?.criteria?.narrative).toContain('brain');
    expect(achieved?.criteria?.narrative).toContain('2 hotspots');
    expect(achieved?.criteria?.narrative).toContain('cortex, hippocampus');
    expect(achieved?.description).toContain('brain lesson concepts');
    expect(`${achieved?.criteria?.narrative ?? ''} ${achieved?.description ?? ''}`).not.toMatch(
      /heart|six landmarks/i,
    );

    const [payload, signature] = credential.split('.');
    const position = 8;
    const tampered =
      payload.slice(0, position) +
      (payload[position] === 'A' ? 'B' : 'A') +
      payload.slice(position + 1);
    const rejected = await request(app, '/api/badge/verify', {
      credential: `${tampered}.${signature}`,
    });
    expect((await rejected.json()) as { valid: boolean }).toMatchObject({ valid: false });
  });

  it('reports non-heart hotspot IDs when the lesson is not mastered', async () => {
    const app = createApp({
      auth: authFor('newcomer'),
      db: new InMemoryProgressRepository(),
      getChunks: (lessonId) =>
        lessonId === 'planets'
          ? [
              {
                hotspotId: 'planet_core',
                id: 'planets:planet_core:overview',
                layer: 'overview',
                lessonId,
                text: 'The planet core is dense and hot.',
              },
            ]
          : [],
      kv: new InMemoryKv(),
    });
    const response = await request(app, '/api/badge/issue', { lessonId: 'planets' });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { failing: string[] };
    expect(body.failing).toEqual(['planet_core']);
  });
});
