import { describe, expect, it } from 'vitest';
import { createBadgeService } from '../../api/src/lib/badge';

const SECRET = 'unit-test-fixed-secret';

describe('createBadgeService', () => {
  it('issues an OB3-shaped credential that verifies', async () => {
    const service = createBadgeService(SECRET);
    const envelope = await service.issue({
      lessonId: 'heart',
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
});
