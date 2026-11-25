/**
 * Cookie-based Better Auth calls. Plain fetch is used deliberately: the client
 * generics add no value here, and no token is ever read or logged by the UI.
 */
export const AUTH_PATHS = {
  getSession: '/api/auth/get-session',
  signInEmail: '/api/auth/sign-in/email',
  signInSocial: '/api/auth/sign-in/social',
  signOut: '/api/auth/sign-out',
  signUpEmail: '/api/auth/sign-up/email',
} as const;

export const SESSION_CHANGE_EVENT = 'perspectra:session-change';

export interface AuthIdentity {
  email: string;
  name: string;
}

export interface SessionLookup {
  identity: AuthIdentity | null;
  unavailable: boolean;
}

export interface AuthAction {
  message: string | null;
  ok: boolean;
  redirectUrl: string | null;
  unavailable: boolean;
}

interface SessionBody {
  user?: { email?: string; name?: string } | null;
}

interface ErrorBody {
  error?: { message?: string } | string;
  message?: string;
}

interface SuccessBody {
  url?: string;
}

function isUnavailable(status: number): boolean {
  return status === 404 || status === 501;
}

async function readError(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as ErrorBody | null;
    if (body?.error && typeof body.error === 'object') {
      return body.error.message ?? null;
    }
    if (typeof body?.error === 'string') {
      return body.error;
    }
    return body?.message ?? null;
  } catch {
    return null;
  }
}

export async function lookupSession(): Promise<SessionLookup> {
  try {
    const response = await fetch(AUTH_PATHS.getSession, { credentials: 'include' });
    if (isUnavailable(response.status)) {
      return { identity: null, unavailable: true };
    }
    if (!response.ok) {
      return { identity: null, unavailable: false };
    }
    const body = (await response.json()) as SessionBody | null;
    if (!body?.user) {
      return { identity: null, unavailable: false };
    }
    return {
      identity: {
        email: typeof body.user.email === 'string' ? body.user.email : '',
        name: typeof body.user.name === 'string' ? body.user.name : '',
      },
      unavailable: false,
    };
  } catch {
    return { identity: null, unavailable: false };
  }
}

export async function postAuth(path: string, payload: Record<string, string>): Promise<AuthAction> {
  let response: Response;
  try {
    response = await fetch(path, {
      body: JSON.stringify(payload),
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  } catch {
    return { message: null, ok: false, redirectUrl: null, unavailable: true };
  }

  if (!response.ok) {
    const unavailable = isUnavailable(response.status);
    return {
      message: unavailable ? null : await readError(response),
      ok: false,
      redirectUrl: null,
      unavailable,
    };
  }

  let redirectUrl: string | null = null;
  try {
    const body = (await response.json()) as SuccessBody | null;
    if (typeof body?.url === 'string' && /^https?:\/\//i.test(body.url)) {
      redirectUrl = body.url;
    }
  } catch {
    // An empty success body is valid for sign-out.
  }
  return { message: null, ok: true, redirectUrl, unavailable: false };
}

/** Best human-facing label for an account; never a token or a credential. */
export function accountLabel(identity: AuthIdentity): string {
  return identity.name || identity.email || 'your account';
}
