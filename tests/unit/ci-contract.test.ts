import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkWorkflowFile, checkWorkflowText, WORKFLOW_PATH } from '../../scripts/check-ci.mjs';

const valid = `name: PR verification

on:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps: []
  e2e:
    runs-on: ubuntu-latest
    steps: []
`;

describe('checkWorkflowText', () => {
  it('accepts a pull_request-only workflow with verify and e2e jobs', () => {
    expect(checkWorkflowText(valid)).toEqual([]);
  });

  it('rejects a workflow without an on: block', () => {
    const source = valid.replace('on:\n  pull_request:\n\n', '');
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('on:')]);
  });

  it('rejects a trigger other than pull_request', () => {
    const source = valid.replace('pull_request:', 'push:');
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('pull_request')]);
  });

  it('rejects an extra trigger alongside pull_request', () => {
    const source = valid.replace('on:\n', 'on:\n  push:\n');
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('pull_request')]);
  });

  it('rejects a workflow without a jobs: block', () => {
    const source = valid.slice(0, valid.indexOf('jobs:'));
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('jobs:')]);
  });

  it('rejects a missing job', () => {
    const source = valid.replace('  e2e:\n    runs-on: ubuntu-latest\n    steps: []\n', '');
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('e2e')]);
  });

  it('rejects an extra job', () => {
    const source = `${valid}  deploy:\n    runs-on: ubuntu-latest\n    steps: []\n`;
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('exactly two jobs')]);
  });

  it('rejects a renamed job', () => {
    const source = valid.replace('  e2e:', '  integration:');
    expect(checkWorkflowText(source)).toEqual([expect.stringContaining('verify')]);
  });
});

describe('checked-in CI workflow', () => {
  const source = readFileSync(WORKFLOW_PATH, 'utf8');

  it('satisfies the contract checker', () => {
    expect(checkWorkflowText(source)).toEqual([]);
    expect(() => checkWorkflowFile()).not.toThrow();
  });

  it('runs pnpm verify and the serial smoke/E2E/perf chain', () => {
    expect(source).toContain('pnpm verify');
    expect(source).toContain(
      'pnpm smoke && pnpm exec playwright test --grep-invert @perf && pnpm test:perf',
    );
  });

  it('uses pinned setup actions with Node 24 and the pnpm cache', () => {
    expect(source).toContain('actions/checkout@v4');
    expect(source).toContain('pnpm/action-setup@v4');
    expect(source).toContain('actions/setup-node@v4');
    expect(source).toContain('node-version: 24');
    expect(source).toContain('cache: pnpm');
  });

  it('installs Playwright Chromium for the e2e job', () => {
    expect(source).toContain('pnpm exec playwright install --with-deps chromium');
  });

  it('has no secrets or credentials', () => {
    expect(source).not.toMatch(/secrets\./);
    expect(source).not.toMatch(/DATABASE_URL|CLIENT_SECRET|LLM_API_KEY|CLOUDFLARE|CF_API_TOKEN/);
  });

  it('retries only the two documented flakes, once each', () => {
    expect(source).toContain('All matched files use the correct format');
    expect(source).toContain('exit code 5');
    expect(source).toContain('chrome.kill()');
    expect(source).toContain('retrying once');
    expect(source.match(/retrying/g)).toHaveLength(2);
  });
});

describe('package scripts', () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { scripts: Record<string, string> };

  it('keeps test:e2e as the full suite for direct callers', () => {
    expect(scripts['test:e2e']).toBe('playwright test');
  });

  it('runs only @perf tests with one worker in test:perf', () => {
    expect(scripts['test:perf']).toBe('playwright test --grep @perf --workers=1');
  });

  it('runs non-performance E2E before a serial perf pass in verify:full', () => {
    expect(scripts['verify:full']).toBe(
      'pnpm verify && pnpm smoke && pnpm exec playwright test --grep-invert @perf && pnpm test:perf',
    );
  });
});
