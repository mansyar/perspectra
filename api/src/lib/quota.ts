import type { KvPort } from './kv';

export interface QuotaResult {
  allowed: boolean;
  reason?: 'anon_limit' | 'user_limit' | 'token_limit' | 'turn_limit' | 'kill_switch';
  message?: string;
}

const DAY_TTL = 86_400;
const MONTH_TTL = 2_592_000;
// Flat planning rate: $0.002 per 1k tokens. No pricing table needed for the MVP.
const COST_PER_TOKEN = 0.002 / 1000;

function day(): string {
  return new Date().toISOString().slice(0, 10);
}

function counter(value: string | number | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Counters are monotonic and expire with their bucket; we never decrement.
 * Anonymous learners get 2 questions/day; signed-in learners get 60 questions,
 * 150k tokens and 16 turns per session, under a $10/month hard kill switch.
 */
export async function checkQuota(
  kv: KvPort,
  identity: { authenticated: boolean; id: string },
  turnIndex: number,
  estimatedTokens: number,
): Promise<QuotaResult> {
  const today = day();

  if (!identity.authenticated) {
    const key = `tutor:anon:${identity.id}:${today}`;
    const used = counter(await kv.get(key));
    if (used >= 2) {
      return {
        allowed: false,
        reason: 'anon_limit',
        message: 'You have used your 2 free questions. Sign in to continue asking the tutor.',
      };
    }
    await kv.put(key, used + 1, DAY_TTL);
    return { allowed: true };
  }

  if (turnIndex > 16) {
    return {
      allowed: false,
      reason: 'turn_limit',
      message: 'This conversation has reached its 16-turn limit. Please start a new session.',
    };
  }

  const userKey = `tutor:user:${identity.id}:${today}`;
  const tokenKey = `tutor:tokens:${identity.id}:${today}`;
  const costKey = `tutor:cost:${today.slice(0, 7)}`;
  const [used, tokens, cost] = await Promise.all([
    kv.get(userKey),
    kv.get(tokenKey),
    kv.get(costKey),
  ]);
  const questions = counter(used);
  const usedTokens = counter(tokens);
  const monthCost = counter(cost);

  if (questions >= 60) {
    return {
      allowed: false,
      reason: 'user_limit',
      message: "You have reached today's question limit. Please try again tomorrow.",
    };
  }
  if (usedTokens >= 150_000) {
    return {
      allowed: false,
      reason: 'token_limit',
      message: "You have reached today's token budget. Please try again tomorrow.",
    };
  }
  if (monthCost >= 10) {
    return {
      allowed: false,
      reason: 'kill_switch',
      message:
        'The tutor is temporarily unavailable this month. The lesson prose remains available.',
    };
  }

  await Promise.all([
    kv.put(userKey, questions + 1, DAY_TTL),
    kv.put(tokenKey, usedTokens + estimatedTokens, DAY_TTL),
    kv.put(costKey, monthCost + estimatedTokens * COST_PER_TOKEN, MONTH_TTL),
  ]);
  return { allowed: true };
}
