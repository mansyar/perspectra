import { useEffect, useState } from 'react';
import { resolveNext } from '../../lib/auth-navigation';
import {
  accountLabel,
  AUTH_PATHS,
  lookupSession,
  postAuth,
  SESSION_CHANGE_EVENT,
} from './auth-client';

interface Notice {
  kind: 'alert' | 'status';
  text: string;
}

const UNAVAILABLE = 'Sign-in is unavailable in this preview.';

function unavailableOrMessage(
  result: { message: string | null; unavailable: boolean },
  fallback: string,
): string {
  return result.unavailable || !result.message ? fallback : result.message;
}

export function SignInPanel() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [next, setNext] = useState('/');
  const [identity, setIdentity] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('next');
    setNext(resolveNext(requested, window.location.origin));

    let active = true;
    void lookupSession().then(({ identity: found, unavailable }) => {
      if (!active) {
        return;
      }
      if (found) {
        setIdentity(accountLabel(found));
      } else if (unavailable) {
        setNotice({ kind: 'alert', text: UNAVAILABLE });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function submitCredentials(kind: 'sign-in' | 'sign-up'): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const path = kind === 'sign-in' ? AUTH_PATHS.signInEmail : AUTH_PATHS.signUpEmail;
    const payload: Record<string, string> = { email, password };
    if (kind === 'sign-up') {
      payload.name = name;
    }
    const result = await postAuth(path, payload);
    setBusy(false);
    if (!result.ok) {
      setNotice({ kind: 'alert', text: unavailableOrMessage(result, UNAVAILABLE) });
      return;
    }
    setNotice({ kind: 'status', text: 'Continue to your lesson…' });
    window.location.assign(next);
  }

  async function startGoogle(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const result = await postAuth(AUTH_PATHS.signInSocial, {
      callbackURL: next,
      provider: 'google',
    });
    setBusy(false);
    if (!result.ok) {
      setNotice({ kind: 'alert', text: unavailableOrMessage(result, UNAVAILABLE) });
      return;
    }
    if (!result.redirectUrl) {
      setNotice({ kind: 'alert', text: 'Google sign-in did not return a redirect.' });
      return;
    }
    window.location.assign(result.redirectUrl);
  }

  async function signOut(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const result = await postAuth(AUTH_PATHS.signOut, {});
    setBusy(false);
    if (!result.ok) {
      setNotice({
        kind: 'alert',
        text: unavailableOrMessage(result, 'Sign out is unavailable in this preview.'),
      });
      return;
    }
    setIdentity(null);
    setNotice({ kind: 'status', text: 'Signed out.' });
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
  }

  return (
    <section aria-labelledby="sign-in-heading" className="sign-in-panel" data-sign-in-panel="">
      <h1 id="sign-in-heading">Sign in to Perspectra</h1>
      <p className="sign-in-panel__intro">Pick up where you left off in your lesson.</p>
      {notice ? (
        <p className="sign-in-panel__notice" data-sign-in-notice="" role={notice.kind}>
          {notice.text}
        </p>
      ) : null}
      {identity ? (
        <div className="sign-in-panel__account">
          <p>
            Signed in as <strong>{identity}</strong>.
          </p>
          <a href={next}>Continue to your lesson</a>
          <button disabled={busy} onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
      ) : (
        <>
          <form
            className="sign-in-panel__form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCredentials('sign-in');
            }}
          >
            <label htmlFor="sign-in-email">Email</label>
            <input
              autoComplete="email"
              data-sign-in-email=""
              id="sign-in-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <label htmlFor="sign-in-password">Password</label>
            <input
              autoComplete="current-password"
              data-sign-in-password=""
              id="sign-in-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <label htmlFor="sign-up-name">Name (new accounts)</label>
            <input
              autoComplete="name"
              id="sign-up-name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              type="text"
              value={name}
            />
            <div className="sign-in-panel__actions">
              <button
                data-sign-in-submit=""
                disabled={busy || email.length === 0 || password.length === 0}
                type="submit"
              >
                Sign in
              </button>
              <button
                data-sign-up-submit=""
                disabled={busy || name.length === 0 || email.length === 0 || password.length === 0}
                onClick={() => void submitCredentials('sign-up')}
                type="button"
              >
                Create account
              </button>
            </div>
          </form>
          <div className="sign-in-panel__divider">or</div>
          <button
            className="sign-in-panel__google"
            data-google-sign-in=""
            disabled={busy}
            onClick={() => void startGoogle()}
            type="button"
          >
            Continue with Google
          </button>
        </>
      )}
      <p className="sign-in-panel__trust">
        Use your email address or Google account to continue. GitHub sign-in is not offered yet.
      </p>
    </section>
  );
}
