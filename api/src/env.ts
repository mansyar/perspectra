/** Minimal structural type for the Workers KV namespace we use. */
export interface KvBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Bindings available to the Worker. Secrets are injected at deploy time and
 * never declared in wrangler.toml or read by client code.
 */
export interface Env {
  RATE_LIMIT_KV?: KvBinding;
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Only `gemini` is supported; omit for the default. */
  LLM_PROVIDER?: string;
  LLM_API_KEY?: string;
  /** Chat model override; defaults to `gemini-2.5-flash`. */
  LLM_MODEL?: string;
  /** Optional Gemini embedding key; falls back to `LLM_API_KEY`. */
  EMBEDDING_API_KEY?: string;
  /** Only `gemini-embedding-2` (optionally prefixed with `models/`) is supported. */
  EMBEDDING_MODEL?: string;
}
