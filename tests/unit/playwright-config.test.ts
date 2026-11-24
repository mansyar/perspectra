import { devices } from '@playwright/test';
import { describe, expect, it } from 'vitest';
import { resolvePlaywrightConfig } from '../../playwright.config';

const LOCAL_ORIGIN = 'http://127.0.0.1:4321';

describe('Playwright target configuration', () => {
  it('keeps the local preview server when E2E_BASE_URL is absent', () => {
    const config = resolvePlaywrightConfig({});

    expect(config.use?.baseURL).toBe(LOCAL_ORIGIN);
    expect(config.webServer).toEqual({
      command: 'pnpm preview --host 127.0.0.1 --port 4321',
      reuseExistingServer: true,
      timeout: 120_000,
      url: `${LOCAL_ORIGIN}/lessons/heart/`,
    });
    expect(config.projects).toHaveLength(1);
    expect(config.projects?.[0]?.name).toBe('chromium');
    expect(config.projects?.[0]?.use).toEqual(devices['Desktop Chrome']);
  });

  it('uses an external origin without starting a web server', () => {
    const config = resolvePlaywrightConfig({ E2E_BASE_URL: 'https://public.example/' });

    expect(config.use?.baseURL).toBe('https://public.example');
    expect(config.webServer).toBeUndefined();
    expect(config.timeout).toBe(60_000);
    expect(config.use?.trace).toBe('retain-on-failure');
  });

  it.each([
    '',
    '/relative',
    'ftp://public.example',
    'https://public.example/catalog',
    'https://public.example/.',
    'https://public.example//',
    'https://public.example?query=1',
    'https://public.example#section',
    'https://user:password@public.example',
    'https://@public.example',
    'not a url',
  ])('rejects an invalid external base URL: %s', (value) => {
    expect(() => resolvePlaywrightConfig({ E2E_BASE_URL: value })).toThrow('E2E_BASE_URL');
  });
});
