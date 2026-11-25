import { describe, expect, it } from 'vitest';
import { resolveNext, signInHref } from '../../src/lib/auth-navigation';

const ORIGIN = 'https://perspectra.example';

describe('resolveNext', () => {
  it.each([null, undefined, '', '/'])('defaults to / for %s', (raw) => {
    expect(resolveNext(raw, ORIGIN)).toBe('/');
  });

  it.each([
    '/lessons/heart',
    '/lessons/earth-interior?layer=core#outer-core',
    '/verify/?credential=abc',
  ])('accepts the safe root-relative path %s', (raw) => {
    expect(resolveNext(raw, ORIGIN)).toBe(raw);
  });

  it('accepts a same-origin absolute URL and strips its origin', () => {
    expect(resolveNext(`${ORIGIN}/lessons/heart?x=1#top`, ORIGIN)).toBe('/lessons/heart?x=1#top');
  });

  it('normalizes a same-origin URL with a default port', () => {
    expect(resolveNext('https://perspectra.example:443/verify', ORIGIN)).toBe('/verify');
  });

  it('rejects a protocol-relative URL', () => {
    expect(resolveNext('//evil.example/path', ORIGIN)).toBe('/');
  });

  it('rejects a backslash-smuggled protocol-relative URL', () => {
    expect(resolveNext('/\\evil.example/path', ORIGIN)).toBe('/');
  });

  it('rejects a cross-origin absolute URL', () => {
    expect(resolveNext('https://evil.example/lessons/heart', ORIGIN)).toBe('/');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'blob:https://evil.example/id',
  ])('rejects the unsafe scheme in %s', (raw) => {
    expect(resolveNext(raw, ORIGIN)).toBe('/');
  });

  it('rejects credentials in an absolute URL', () => {
    expect(resolveNext('https://user:pass@perspectra.example/lessons/heart', ORIGIN)).toBe('/');
  });

  it('rejects credentials disguised as a host', () => {
    expect(resolveNext('https://perspectra.example@evil.example/lessons', ORIGIN)).toBe('/');
  });

  it('rejects a bare relative path', () => {
    expect(resolveNext('lessons/heart', ORIGIN)).toBe('/');
  });

  it('rejects control characters', () => {
    expect(resolveNext('/lessons/heart\nLocation: https://evil.example', ORIGIN)).toBe('/');
  });

  it('normalizes empty query and hash delimiters away', () => {
    expect(resolveNext('/lessons/heart?#', ORIGIN)).toBe('/lessons/heart');
  });
});

describe('signInHref', () => {
  it('links a root lesson path', () => {
    expect(signInHref('/lessons/heart/')).toBe('/sign-in?next=%2Flessons%2Fheart%2F');
  });

  it('preserves the query and hash of the return URL', () => {
    expect(signInHref('/lessons/earth-interior/?layer=core#outer-core')).toBe(
      '/sign-in?next=%2Flessons%2Fearth-interior%2F%3Flayer%3Dcore%23outer-core',
    );
  });

  it('encodes reserved characters in the return URL', () => {
    expect(signInHref('/lessons/heart?next=/verify&x=1#top')).toBe(
      '/sign-in?next=%2Flessons%2Fheart%3Fnext%3D%2Fverify%26x%3D1%23top',
    );
  });

  it.each([undefined, null, ''])('falls back to /sign-in for %s', (raw) => {
    expect(signInHref(raw)).toBe('/sign-in');
  });
});
