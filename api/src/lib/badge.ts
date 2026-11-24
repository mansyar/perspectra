const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Stable, dependency-free JSON canonicalization for the HMAC input. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .toSorted()
        .map((key) => [key, canonical(record[key])]),
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url input');
  }
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

/** Shared by badge signing and quiz record signing; no key material is logged. */
export async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

export interface BadgeIssueInput {
  lessonId: string;
  mastery: number;
  userId: string;
  now?: Date;
  hotspots?: readonly string[];
}

export interface CredentialEnvelope {
  credential: string;
  verifyPath: '/verify';
}

export interface VerificationResult {
  valid: boolean;
  credential?: Record<string, unknown>;
  reason?: string;
}

export interface BadgeService {
  issue(input: BadgeIssueInput): Promise<CredentialEnvelope>;
  verify(encoded: string): Promise<VerificationResult>;
}

/**
 * OB3-shaped Verifiable Credential with a portfolio-scale HMAC DataIntegrityProof.
 * This is an honest symmetric-key proof suite, NOT an Ed25519/VC-DI claim; a
 * production issuer would use an asymmetric suite and a public DID document.
 */
export function createBadgeService(secret: string): BadgeService {
  return {
    async issue(input: BadgeIssueInput): Promise<CredentialEnvelope> {
      const hotspots = input.hotspots ?? [];
      const noun = hotspots.length === 1 ? 'hotspot' : 'hotspots';
      const narrative =
        hotspots.length > 0
          ? `Mastered all ${hotspots.length} ${noun} (${hotspots.join(', ')}) of the ${input.lessonId} lesson with mastery at or above 0.85.`
          : `Mastered the ${input.lessonId} lesson with mastery at or above 0.85.`;
      const credential: Record<string, unknown> = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        credentialSubject: {
          achievement: {
            criteria: { narrative },
            description: `Demonstrated mastery of the ${input.lessonId} lesson concepts in Perspectra.`,
            id: `https://perspectra.example/lessons/${input.lessonId}`,
            name: input.lessonId === 'heart' ? 'Human Heart Mastery' : `${input.lessonId} mastery`,
          },
          id: `urn:uuid:${input.userId}`,
        },
        issuanceDate: (input.now ?? new Date()).toISOString(),
        issuer: { id: 'https://perspectra.example', name: 'Perspectra' },
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
      };
      const signature = await hmacSha256(secret, canonicalJson(credential));
      credential.proof = {
        created: (input.now ?? new Date()).toISOString(),
        cryptosuite: 'hmac-sha256',
        proofPurpose: 'assertionMethod',
        proofValue: signature,
        type: 'DataIntegrityProof',
      };
      const encoded = `${toBase64Url(encoder.encode(canonicalJson(credential)))}.${signature}`;
      return { credential: encoded, verifyPath: '/verify' };
    },

    async verify(encoded: string): Promise<VerificationResult> {
      try {
        const parts = encoded.split('.');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          return { valid: false, reason: 'malformed' };
        }
        const parsed = JSON.parse(decoder.decode(fromBase64Url(parts[0]))) as Record<
          string,
          unknown
        >;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.proof) {
          return { valid: false, reason: 'malformed' };
        }
        const unsigned = { ...parsed };
        delete unsigned.proof;
        const expected = await hmacSha256(secret, canonicalJson(unsigned));
        if (expected !== parts[1]) {
          return { valid: false, reason: 'invalid_signature' };
        }
        return { credential: parsed, valid: true };
      } catch {
        return { valid: false, reason: 'malformed' };
      }
    },
  };
}
