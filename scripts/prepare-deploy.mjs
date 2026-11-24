/**
 * Render a private Wrangler config without changing the committed template.
 *
 * Usage: RATE_LIMIT_KV_ID=<private-id> pnpm deploy:prepare
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkConfig, rateLimitKvId } from './check-config.mjs';

const TEMPLATE_PATH = fileURLToPath(new URL('../wrangler.toml', import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL('../.conductor/deploy/wrangler.toml', import.meta.url));
const PLACEHOLDER = '0'.repeat(32);
const ZERO_ID = /^0+$/;
const ID_LINE = /^(\s*id\s*=\s*["'])0{32}(["'])/;

function replacePlaceholder(template, privateId) {
  const newline = template.includes('\r\n') ? '\r\n' : '\n';
  const lines = template.split(/\r?\n/);
  const rendered = [];
  let block = [];
  let replaced = false;

  const flush = () => {
    if (!replaced && rateLimitKvId(block.join('\n')) === PLACEHOLDER) {
      block = block.map((line) => {
        if (!ID_LINE.test(line)) return line;
        replaced = true;
        return line.replace(ID_LINE, `$1${privateId}$2`);
      });
    }
    rendered.push(...block);
    block = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[\[.+\]\]$/.test(trimmed) || /^\[.+\]$/.test(trimmed)) {
      flush();
    }
    block.push(line);
  }
  flush();

  if (!replaced) {
    throw new Error('Deployment config failed: the RATE_LIMIT_KV placeholder id was not found.');
  }
  return rendered.join(newline);
}

/**
 * Validate the template and operator-supplied id, then return private config text.
 * @param {string} template committed wrangler.toml text
 * @param {{ RATE_LIMIT_KV_ID?: string }} [env]
 * @returns {string}
 */
export function renderDeploymentConfig(template, env = {}) {
  const committed = rateLimitKvId(template);
  if (!committed) {
    const result = checkConfig(template, env);
    throw new Error(
      result.ok
        ? 'Deployment config failed: committed wrangler.toml is missing the RATE_LIMIT_KV namespace.'
        : `Deployment config failed: ${result.message}`,
    );
  }
  if (!ZERO_ID.test(committed)) {
    throw new Error(
      'Deployment config failed: committed wrangler.toml must keep the 32-zero RATE_LIMIT_KV placeholder; refusing to overwrite a committed id.',
    );
  }

  const result = checkConfig(template, env);
  if (!result.ok) {
    throw new Error(result.message);
  }
  const privateId = typeof env.RATE_LIMIT_KV_ID === 'string' ? env.RATE_LIMIT_KV_ID.trim() : '';
  return replacePlaceholder(template, privateId);
}

function invokedDirectly() {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  try {
    const config = renderDeploymentConfig(readFileSync(TEMPLATE_PATH, 'utf8'), process.env);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, config, 'utf8');
    process.stdout.write('Prepared private Wrangler config at .conductor/deploy/wrangler.toml.\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
