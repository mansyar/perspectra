function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Validates a post-authentication return URL. Pure by design: the helper takes
 * the origin explicitly so it can be unit-tested without DOM globals.
 */
export function resolveNext(raw: string | null | undefined, origin: string): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    return '/';
  }
  if (raw.trim() !== raw || hasControlCharacters(raw)) {
    return '/';
  }
  if (/^(javascript|data|blob|vbscript|file):/i.test(raw)) {
    return '/';
  }
  // A protocol-relative URL would be re-read by the browser as cross-origin.
  if (raw.startsWith('//')) {
    return '/';
  }
  const rootRelative = raw.startsWith('/');
  if (!rootRelative && !/^https?:\/\//i.test(raw)) {
    return '/';
  }

  let base: URL;
  let target: URL;
  try {
    base = new URL(origin);
    target = new URL(raw, base);
  } catch {
    return '/';
  }

  if (
    target.origin !== base.origin ||
    target.protocol !== base.protocol ||
    (target.protocol !== 'http:' && target.protocol !== 'https:') ||
    target.username !== '' ||
    target.password !== ''
  ) {
    return '/';
  }

  const pathname = target.pathname;
  // Backslashes are normalized to slashes by the URL parser; reject the result.
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/';
  }
  return `${pathname}${target.search}${target.hash}` || '/';
}

/**
 * Builds a same-origin sign-in link that returns to the given path. Pure by
 * design so the encoded return URL can be unit-tested without DOM globals.
 */
export function signInHref(returnTo: string | null | undefined): string {
  if (!returnTo) {
    return '/sign-in';
  }
  return `/sign-in?next=${encodeURIComponent(returnTo)}`;
}
