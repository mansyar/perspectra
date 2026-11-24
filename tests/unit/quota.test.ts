import { describe, expect, it } from 'vitest';
import type { KvPort } from '../../api/src/lib/kv';
import { checkQuota } from '../../api/src/lib/quota';

class FakeKv implements KvPort {
  readonly values = new Map<string, string | number>();

  async get(key: string): Promise<string | number | null> {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string | number, ttlSeconds: number): Promise<void> {
    expect(ttlSeconds).toBeGreaterThan(0);
    this.values.set(key, value);
  }
}

const anon = { authenticated: false, id: 'anon-1' };
const user = { authenticated: true, id: 'user-1' };
const today = new Date().toISOString().slice(0, 10);

describe('checkQuota', () => {
  it('allows the first two anonymous questions and blocks the third with a sign-in hint', async () => {
    const kv = new FakeKv();
    expect((await checkQuota(kv, anon, 1, 100)).allowed).toBe(true);
    expect((await checkQuota(kv, anon, 2, 100)).allowed).toBe(true);
    const third = await checkQuota(kv, anon, 3, 100);
    expect(third.allowed).toBe(false);
    expect(third.reason).toBe('anon_limit');
    expect(third.message).toContain('Sign in');
    expect(kv.values.get(`tutor:anon:anon-1:${today}`)).toBe(2);
  });

  it('blocks authenticated turn 17', async () => {
    const result = await checkQuota(new FakeKv(), user, 17, 100);
    expect(result).toMatchObject({ allowed: false, reason: 'turn_limit' });
  });

  it('blocks on the daily question limit', async () => {
    const kv = new FakeKv();
    kv.values.set(`tutor:user:user-1:${today}`, 60);
    expect(await checkQuota(kv, user, 1, 100)).toMatchObject({
      allowed: false,
      reason: 'user_limit',
    });
  });

  it('blocks on the daily token budget', async () => {
    const kv = new FakeKv();
    kv.values.set(`tutor:tokens:user-1:${today}`, 150_000);
    expect(await checkQuota(kv, user, 1, 100)).toMatchObject({
      allowed: false,
      reason: 'token_limit',
    });
  });

  it('blocks on the monthly kill switch', async () => {
    const kv = new FakeKv();
    kv.values.set(`tutor:cost:${today.slice(0, 7)}`, 10);
    expect(await checkQuota(kv, user, 1, 100)).toMatchObject({
      allowed: false,
      reason: 'kill_switch',
    });
  });

  it('increments question, token and cost counters monotonically', async () => {
    const kv = new FakeKv();
    expect((await checkQuota(kv, user, 1, 1000)).allowed).toBe(true);
    expect(kv.values.get(`tutor:user:user-1:${today}`)).toBe(1);
    expect(kv.values.get(`tutor:tokens:user-1:${today}`)).toBe(1000);
    expect(kv.values.get(`tutor:cost:${today.slice(0, 7)}`)).toBeCloseTo(0.002);
  });
});
