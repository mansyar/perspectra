import { describe, expect, it } from 'vitest';
import { resolveNext } from '../../src/lib/auth-navigation';

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
