import { useEffect, useState } from 'react';
import { resolveNext } from '../../lib/auth-navigation';
import {
  accountLabel,
  AUTH_PATHS,
  lookupSession,
  postAuth,
  SESSION_CHANGE_EVENT,
} from './auth-client';

interface SiteHeaderProps {
  current?: 'lessons' | 'sign-in' | 'verify';
  returnTo?: string;
}

// returnTo is always a page-supplied root-relative path, so a stable placeholder
// origin is enough to validate it while keeping this island SSR-safe.
const VALIDATION_ORIGIN = 'https://perspectra.invalid';

export function SiteHeader({ current, returnTo }: SiteHeaderProps) {
  const [identity, setIdentity] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const next = resolveNext(returnTo, VALIDATION_ORIGIN);
  const signInHref = next === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void lookupSession().then(({ identity: found }) => {
        if (active) {
          setIdentity(found ? accountLabel(found) : null);
        }
      });
    };
    refresh();
    window.addEventListener(SESSION_CHANGE_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(SESSION_CHANGE_EVENT, refresh);
    };
  }, []);

  async function signOut(): Promise<void> {
    setMessage(null);
    const result = await postAuth(AUTH_PATHS.signOut, {});
    if (!result.ok) {
      setMessage(result.message ?? 'Sign out is unavailable right now.');
      return;
    }
    setIdentity(null);
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
  }

  return (
    <header className="site-header">
      <a className="site-header__brand" href="/">
        Perspectra
      </a>
      <nav aria-label="Main navigation" className="site-header__nav">
        <a aria-current={current === 'lessons' ? 'page' : undefined} href="/">
          Lessons
        </a>
        <a aria-current={current === 'verify' ? 'page' : undefined} href="/verify">
          Verify
        </a>
      </nav>
      {identity ? (
        <div className="site-header__account">
          <span
            aria-label={`Signed in as ${identity}`}
            className="site-header__identity"
            title={identity}
          >
            {identity}
          </span>
          <button
            aria-label="Sign out"
            className="site-header__signout"
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="site-header__account">
          <a className="site-header__signin" href={signInHref}>
            Sign in
          </a>
        </div>
      )}
      {message ? (
        <p className="site-header__message" role="alert">
          {message}
        </p>
      ) : null}
    </header>
  );
}
