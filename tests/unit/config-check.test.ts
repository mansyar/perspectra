import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkConfig, rateLimitKvId } from '../../scripts/check-config.mjs';

const PLACEHOLDER = '0'.repeat(32);
const REAL_ID = '0123456789abcdef0123456789abcdef';

function wranglerText(id = PLACEHOLDER): string {
  return `name = "perspectra-api"\n\n[[kv_namespaces]]\nbinding = "RATE_LIMIT_KV"\nid = "${id}"\n`;
}

describe('config check', () => {
  it('reads the id from the RATE_LIMIT_KV binding only', () => {
    const text = `${wranglerText()}\n[[kv_namespaces]]\nbinding = "OTHER_KV"\nid = "${REAL_ID}"\n`;
    expect(rateLimitKvId(text)).toBe(PLACEHOLDER);
  });

  it('fails on the committed placeholder id', () => {
    const result = checkConfig(wranglerText(), {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain('placeholder');
  });

  it('passes with an operator-supplied non-placeholder 32-hex id', () => {
    const result = checkConfig(wranglerText(), { RATE_LIMIT_KV_ID: REAL_ID });
    expect(result.ok).toBe(true);
    expect(result.message).toContain('non-placeholder');
  });

  it('passes when the committed id is already a real 32-hex value', () => {
    expect(checkConfig(wranglerText(REAL_ID), {}).ok).toBe(true);
  });

  it('fails with a helpful message on a malformed supplied id', () => {
    const result = checkConfig(wranglerText(), { RATE_LIMIT_KV_ID: 'not-a-namespace' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('32-character hexadecimal');
  });

  it('fails when the RATE_LIMIT_KV binding is missing', () => {
    const result = checkConfig('name = "perspectra-api"\n', {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain('binding = "RATE_LIMIT_KV"');
  });

  it('never echoes an operator-supplied id in its output', () => {
    const result = checkConfig(wranglerText(), { RATE_LIMIT_KV_ID: REAL_ID });
    expect(result.message).not.toContain(REAL_ID);
  });

  it('is wired to the check:config package script', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['check:config']).toBe('node scripts/check-config.mjs');
  });
});
