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

const AUDITED_PATHS = ['/', '/lessons/heart/'] as const;

test(
  'catalog and lesson meet Lighthouse budgets with zero catalog JS',
  { tag: '@perf' },
  async ({ baseURL }) => {
    test.setTimeout(180_000);
    const origin = baseURL ?? 'http://127.0.0.1:4321';
    const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
    try {
      const flags = { ...LIGHTHOUSE_FLAGS, port: chrome.port } as Parameters<typeof lighthouse>[1];
      for (const path of AUDITED_PATHS) {
        const url = new URL(path, origin).href;
        const result = await lighthouse(url, flags);
        const scores = assertCategoryScores(result, path);
        console.info(`Lighthouse ${path}: ${JSON.stringify(scores)}`);
      }
    } finally {
      await chrome.kill();
    }

    const catalogHtml = readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
    assertStaticCatalog(catalogHtml);
    assertCatalogJsBudget(0);
  },
);
