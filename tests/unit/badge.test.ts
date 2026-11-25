import { describe, expect, it } from 'vitest';
import { createBadgeService } from '../../api/src/lib/badge';
import { EARTH_LESSON } from '../fixtures/lessons';

const SECRET = 'unit-test-fixed-secret';

describe('createBadgeService', () => {
  it('issues an OB3-shaped credential that verifies', async () => {
    const service = createBadgeService(SECRET);
    const envelope = await service.issue({
      lessonId: 'heart',
      lessonTitle: 'The Human Heart',
      mastery: 0.97,
      userId: 'user-123',
      now: new Date('2026-11-24T00:00:00.000Z'),
    });
    expect(envelope.verifyPath).toBe('/verify');
    expect(envelope.credential).toContain('.');

    const result = await service.verify(envelope.credential);
    expect(result.valid).toBe(true);
    const credential = result.credential ?? {};
    expect(credential.type).toEqual(['VerifiableCredential', 'OpenBadgeCredential']);
    expect(credential['@context']).toContain(
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    );
    expect(credential.issuer).toMatchObject({
      id: 'https://perspectra.example',
      name: 'Perspectra',
    });
    expect(credential.credentialSubject).toMatchObject({
      achievement: { name: 'Human Heart Mastery' },
    });
    expect(credential.proof).toMatchObject({
      cryptosuite: 'hmac-sha256',
      proofPurpose: 'assertionMethod',
      type: 'DataIntegrityProof',
    });
  });

  it('uses a generic lesson title and Earth vocabulary for badge achievements', async () => {
    const service = createBadgeService(SECRET);
    const { credential } = await service.issue({
      hotspots: EARTH_LESSON.hotspots,
      lessonId: 'earth-interior',
      lessonTitle: 'Inside Earth',
      mastery: 1,
      userId: 'user-earth',
    });
    const result = await service.verify(credential);
    expect(result.valid).toBe(true);
    const achieved = achievement(result);
    expect(achieved.name).toBe('Inside Earth Mastery');
    expect(achieved.description).toContain('earth-interior lesson concepts');
    expect(achieved.criteria?.narrative).toContain(EARTH_LESSON.hotspots.join(', '));
    const prose = `${achieved.name} ${achieved.description} ${achieved.criteria?.narrative ?? ''}`;
    expect(prose).not.toMatch(/heart|anatomy|clinical/i);
  });

  it('humanizes a lesson id when no display title is available', async () => {
    const service = createBadgeService(SECRET);
    const { credential } = await service.issue({
      lessonId: 'earth-interior',
      mastery: 1,
      userId: 'user-earth',
    });
    expect(achievement(await service.verify(credential)).name).toBe('Earth Interior Mastery');
  });

  it('rejects a modified payload without throwing', async () => {
    const service = createBadgeService(SECRET);
    const { credential } = await service.issue({ lessonId: 'heart', mastery: 1, userId: 'user-1' });
    const [payload, signature] = credential.split('.');
    const position = 12;
    const changed =
      payload.slice(0, position) +
      (payload[position] === 'A' ? 'B' : 'A') +
      payload.slice(position + 1);
    const result = await service.verify(`${changed}.${signature}`);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('rejects a valid payload signed with a different secret', async () => {
    const issuer = createBadgeService(SECRET);
    const verifier = createBadgeService('another-secret');
    const { credential } = await issuer.issue({ lessonId: 'heart', mastery: 1, userId: 'user-2' });
    const result = await verifier.verify(credential);
    expect(result).toMatchObject({ valid: false, reason: 'invalid_signature' });
  });

  it('rejects malformed input', async () => {
    const service = createBadgeService(SECRET);
    expect(await service.verify('not-a-credential')).toMatchObject({
      valid: false,
      reason: 'malformed',
    });
    expect(await service.verify('!!!.signature')).toMatchObject({
      valid: false,
      reason: 'malformed',
    });
  });

  it('derives a non-heart narrative from lesson id, count and vocabulary', async () => {
    const service = createBadgeService(SECRET);
    const { credential } = await service.issue({
      hotspots: ['cortex', 'hippocampus'],
      lessonId: 'brain',
      mastery: 0.91,
      userId: 'user-brain',
    });
    const result = await service.verify(credential);
    expect(result.valid).toBe(true);
    const achieved = achievement(result);
    expect(achieved.criteria?.narrative).toContain('brain');
    expect(achieved.criteria?.narrative).toContain('2 hotspots');
    expect(achieved.criteria?.narrative).toContain('cortex, hippocampus');
    expect(achieved.description).toContain('brain lesson concepts');
    const prose = `${achieved.criteria?.narrative ?? ''} ${achieved.description ?? ''}`;
    expect(prose).not.toMatch(/heart|six landmarks/i);

    const tampered = tamper(credential);
    expect(await service.verify(tampered)).toMatchObject({ valid: false });
  });

  it('uses count-free prose when hotspots are absent or empty', async () => {
    const service = createBadgeService(SECRET);
    for (const hotspots of [undefined, []]) {
      const { credential } = await service.issue({
        lessonId: 'planets',
        mastery: 1,
        userId: 'user-planets',
        hotspots,
      });
      const result = await service.verify(credential);
      expect(result.valid).toBe(true);
      const achieved = achievement(result);
      expect(achieved.criteria?.narrative).toBe(
        'Mastered the planets lesson with mastery at or above 0.85.',
      );
      expect(achieved.criteria?.narrative).not.toMatch(/heart|six|hotspot/i);
      expect(achieved.description).not.toMatch(/heart/i);
    }
  });

  it('reads a single hotspot as singular', async () => {
    const service = createBadgeService(SECRET);
    const { credential } = await service.issue({
      hotspots: ['planet_core'],
      lessonId: 'planets',
      mastery: 1,
      userId: 'user-planets',
    });
    const achieved = achievement(await service.verify(credential));
    expect(achieved.criteria?.narrative).toContain('1 hotspot (planet_core)');
    expect(achieved.criteria?.narrative).not.toContain('1 hotspots');
  });
});

function achievement(result: { credential?: Record<string, unknown> }): {
  criteria?: { narrative?: string };
  description?: string;
  name?: string;
} {
  const subject = result.credential?.credentialSubject as
    | {
        achievement?: {
          criteria?: { narrative?: string };
          description?: string;
          name?: string;
        };
      }
    | undefined;
  return subject?.achievement ?? {};
}

function tamper(credential: string): string {
  const [payload, signature] = credential.split('.');
  const position = 12;
  const changed =
    payload.slice(0, position) +
    (payload[position] === 'A' ? 'B' : 'A') +
    payload.slice(position + 1);
  return `${changed}.${signature}`;
}
