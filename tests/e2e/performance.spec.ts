import { readFileSync } from 'node:fs';
import { chromium, test } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import {
  assertCatalogJsBudget,
  assertCategoryScores,
  assertStaticCatalog,
  LIGHTHOUSE_FLAGS,
} from '../../lighthouse.config.mjs';

process.env.CHROME_PATH ??= chromium.executablePath();

const AUDITED_PATHS = ['/', '/lessons/heart/', '/lessons/earth-interior/'] as const;

function isWindowsTemporaryProfileEperm(error: unknown): boolean {
  if (process.platform !== 'win32' || typeof error !== 'object' || error === null) return false;
  const { code, path } = error as NodeJS.ErrnoException;
  return (
    code === 'EPERM' &&
    typeof path === 'string' &&
    /(?:^|[\\/])lighthouse\.\d+(?:[\\/]|$)/i.test(path)
  );
}

test.describe('isolated Lighthouse budgets', () => {
  test.describe.configure({ retries: 1 });

  for (const path of AUDITED_PATHS) {
    test(`${path} meets Lighthouse budgets`, { tag: '@perf' }, async ({ baseURL }) => {
      test.setTimeout(180_000);
      const origin = baseURL ?? 'http://127.0.0.1:4321';
      const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
      let auditFailure: { error: unknown } | undefined;
      try {
        const flags = { ...LIGHTHOUSE_FLAGS, port: chrome.port };
        const url = new URL(path, origin).href;
        const result = await lighthouse(url, flags as Parameters<typeof lighthouse>[1]);
        const scores = assertCategoryScores(result, path);
        console.info(`Lighthouse ${path}: ${JSON.stringify(scores)}`);
      } catch (error) {
        auditFailure = { error };
      }

      try {
        // chrome-launcher attempts process termination before removing its temporary profile.
        await chrome.kill();
      } catch (error) {
        if (!isWindowsTemporaryProfileEperm(error)) {
          if (auditFailure) {
            throw new AggregateError(
              [auditFailure.error, error],
              `Lighthouse and Chrome cleanup failed for ${path}.`,
              { cause: error },
            );
          }
          throw error;
        }
        console.warn(
          `Lighthouse ${path}: ignored Windows EPERM from chrome.kill() during temporary-profile cleanup.`,
        );
      }
      if (auditFailure) throw auditFailure.error;

      if (path === '/') {
        const catalogHtml = readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
        assertStaticCatalog(catalogHtml);
        assertCatalogJsBudget(0);
      }
    });
  }
});
