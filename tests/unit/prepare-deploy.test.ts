import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rateLimitKvId } from '../../scripts/check-config.mjs';
import { renderDeploymentConfig } from '../../scripts/prepare-deploy.mjs';

const PLACEHOLDER = '0'.repeat(32);
const PRIVATE_ID = 'a'.repeat(32);
const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MAIN_PATH = resolve(PROJECT_ROOT, 'api/src/index.ts').replaceAll('\\', '/');
const ASSETS_PATH = resolve(PROJECT_ROOT, 'dist').replaceAll('\\', '/');
const TEMPLATE = readFileSync(new URL('../../wrangler.toml', import.meta.url), 'utf8');

describe('private deployment config', () => {
  it('replaces only the RATE_LIMIT_KV placeholder and root-relative config paths', () => {
    const rendered = renderDeploymentConfig(TEMPLATE, { RATE_LIMIT_KV_ID: PRIVATE_ID });
    const expected = TEMPLATE.replace('main = "api/src/index.ts"', `main = "${MAIN_PATH}"`).replace(
      'directory = "./dist"',
      `directory = "${ASSETS_PATH}"`,
    );

    expect(rateLimitKvId(rendered)).toBe(PRIVATE_ID);
    expect(rendered.replace(PRIVATE_ID, PLACEHOLDER)).toBe(expected);
    expect(rendered).toContain('binding = "ASSETS"');
  });

  it('generates absolute normalized paths for the Worker entry point and assets', () => {
    const rendered = renderDeploymentConfig(TEMPLATE, { RATE_LIMIT_KV_ID: PRIVATE_ID });
    const main = rendered.match(/^main\s*=\s*["']([^"']+)["']/m)?.[1];
    const directory = rendered.match(
      /^\[assets\]\r?\n[\s\S]*?^\s*directory\s*=\s*["']([^"']+)["']/m,
    )?.[1];

    if (main === undefined || directory === undefined) {
      throw new Error('Expected generated config to include main and assets.directory paths');
    }
    expect(isAbsolute(main)).toBe(true);
    expect(isAbsolute(directory)).toBe(true);
    expect(main).toBe(MAIN_PATH);
    expect(directory).toBe(ASSETS_PATH);
    expect(main).not.toContain('\\');
    expect(directory).not.toContain('\\');
  });

  it('leaves placeholders in other KV namespaces untouched', () => {
    const template = `${TEMPLATE}\n[[kv_namespaces]]\nbinding = "OTHER_KV"\nid = "${PLACEHOLDER}"\n`;
    const rendered = renderDeploymentConfig(template, { RATE_LIMIT_KV_ID: PRIVATE_ID });

    expect(rendered.match(new RegExp(PRIVATE_ID, 'g'))).toHaveLength(1);
    expect(rendered.match(new RegExp(PLACEHOLDER, 'g'))).toHaveLength(1);
  });

  it('rejects a missing RATE_LIMIT_KV_ID', () => {
    expect(() => renderDeploymentConfig(TEMPLATE, {})).toThrow('RATE_LIMIT_KV_ID');
  });

  it('rejects malformed and all-zero ids without echoing them', () => {
    for (const id of ['private-value-that-must-not-echo', PLACEHOLDER]) {
      expect(() => renderDeploymentConfig(TEMPLATE, { RATE_LIMIT_KV_ID: id })).toThrow();
    }

    try {
      renderDeploymentConfig(TEMPLATE, {
        RATE_LIMIT_KV_ID: 'private-value-that-must-not-echo',
      });
      throw new Error('Expected malformed deployment config to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain('private-value-that-must-not-echo');
    }
  });

  it('refuses to overwrite a real committed namespace id', () => {
    const template = TEMPLATE.replace(PLACEHOLDER, PRIVATE_ID);

    expect(() => renderDeploymentConfig(template, { RATE_LIMIT_KV_ID: PRIVATE_ID })).toThrow(
      'placeholder',
    );
  });

  it('requires the committed template to contain the RATE_LIMIT_KV namespace', () => {
    expect(() =>
      renderDeploymentConfig('name = "perspectra-api"\n', { RATE_LIMIT_KV_ID: PRIVATE_ID }),
    ).toThrow('RATE_LIMIT_KV');
  });

  it('requires E2E_BASE_URL when the production test wrapper runs directly', () => {
    const script = fileURLToPath(
      new URL('../../scripts/run-production-tests.mjs', import.meta.url),
    );
    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      env: { ...process.env, E2E_BASE_URL: '' },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('E2E_BASE_URL');
  });

  it('wires deployment preparation and production tests to package scripts', () => {
    const pkg: unknown = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(pkg).toMatchObject({
      scripts: {
        'deploy:prepare': 'node scripts/prepare-deploy.mjs',
        'test:production': 'node scripts/run-production-tests.mjs',
      },
    });
  });
});
