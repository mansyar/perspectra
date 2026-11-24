/**
 * Usage: pnpm check:config
 *
 * Validates the RATE_LIMIT_KV namespace id without printing or committing
 * values. Operators can supply a real namespace id with RATE_LIMIT_KV_ID;
 * the committed wrangler.toml keeps an obvious placeholder.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WRANGLER_PATH = fileURLToPath(new URL('../wrangler.toml', import.meta.url));
const HEX32_ID = /^[0-9a-f]{32}$/i;
const ZERO_ID = /^0+$/;

/**
 * Extract the id from the kv_namespaces block bound to RATE_LIMIT_KV.
 * @param {string} text wrangler.toml text
 * @returns {string | null}
 */
export function rateLimitKvId(text) {
  let inBlock = false;
  /** @type {string | undefined} */
  let binding;
  /** @type {string | undefined} */
  let id;
  const finish = () => (inBlock && binding === 'RATE_LIMIT_KV' && id ? id : null);

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\[\[.+\]\]$/.test(trimmed) || /^\[.+\]$/.test(trimmed)) {
      const found = finish();
      if (found !== null) return found;
      inBlock = trimmed === '[[kv_namespaces]]';
      binding = undefined;
      id = undefined;
      continue;
    }
    if (!inBlock) continue;
    const bindingMatch = /^binding\s*=\s*["']([^"']+)["']/.exec(trimmed);
    if (bindingMatch) binding = bindingMatch[1];
    const idMatch = /^id\s*=\s*["']([^"']+)["']/.exec(trimmed);
    if (idMatch) id = idMatch[1];
  }
  return finish();
}

/**
 * Check a config without echoing the supplied id.
 * @param {string} text wrangler.toml text
 * @param {{ RATE_LIMIT_KV_ID?: string }} [env]
 * @returns {{ ok: boolean, message: string }}
 */
export function checkConfig(text, env = {}) {
  const committed = rateLimitKvId(text);
  if (!committed) {
    return {
      ok: false,
      message:
        'Config check failed: wrangler.toml needs a [[kv_namespaces]] block with binding = "RATE_LIMIT_KV" and an id.',
    };
  }

  const supplied = typeof env.RATE_LIMIT_KV_ID === 'string' ? env.RATE_LIMIT_KV_ID.trim() : '';
  const id = supplied || committed;
  if (!HEX32_ID.test(id)) {
    return {
      ok: false,
      message:
        'Config check failed: RATE_LIMIT_KV id must be a 32-character hexadecimal namespace id (no prefix, quotes or placeholder text).',
    };
  }
  if (ZERO_ID.test(id)) {
    return {
      ok: false,
      message:
        'Config check failed: RATE_LIMIT_KV id is still the committed placeholder. Set RATE_LIMIT_KV_ID to a real namespace id for this deployment; do not commit it.',
    };
  }
  return {
    ok: true,
    message: 'Config check OK: RATE_LIMIT_KV uses a non-placeholder 32-hex namespace id.',
  };
}

function invokedDirectly() {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  const result = checkConfig(readFileSync(WRANGLER_PATH, 'utf8'), process.env);
  process.stdout.write(`${result.message}\n`);
  if (!result.ok) process.exitCode = 1;
}
