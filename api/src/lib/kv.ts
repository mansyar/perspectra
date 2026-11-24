import type { KvBinding } from '../env';

/** Counter store for write throttling. Values expire after their TTL. */
export interface KvPort {
  get(key: string): Promise<string | number | null>;
  put(key: string, value: string | number, ttlSeconds: number): Promise<void>;
}

/** Test double with no persistence beyond the process. */
export class InMemoryKv implements KvPort {
  private readonly values = new Map<string, string | number>();

  async get(key: string): Promise<string | number | null> {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string | number, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      this.values.delete(key);
      return;
    }
    this.values.set(key, value);
  }
}

/** Adapts the Workers KV binding to the counter store interface. */
export function createWorkersKv(binding: KvBinding | undefined): KvPort {
  return {
    async get(key: string): Promise<string | number | null> {
      if (!binding) {
        return null;
      }
      return binding.get(key);
    },
    async put(key: string, value: string | number, ttlSeconds: number): Promise<void> {
      if (!binding) {
        return;
      }
      await binding.put(key, String(value), { expirationTtl: ttlSeconds });
    },
  };
}
