import { defineConfig, devices } from '@playwright/test';

const LOCAL_ORIGIN = 'http://127.0.0.1:4321';

function externalOrigin(value: string): string {
  const message =
    'E2E_BASE_URL must be an absolute http(s) origin with no path, query, fragment, or credentials.';
  if (
    value.trim() !== value ||
    !/^https?:\/\//i.test(value) ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw new Error(message);
  }
  const authority = value.match(/^https?:\/\/([^/?#\\]+)\/?$/i)?.[1];
  if (!authority || authority.includes('@')) {
    throw new Error(message);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.pathname !== '/' ||
    url.username !== '' ||
    url.password !== '' ||
    url.href.includes('@')
  ) {
    throw new Error(message);
  }
  return url.origin;
}

/** Resolves local preview or external production mode without reading process state. */
export function resolvePlaywrightConfig(env: Record<string, string | undefined>) {
  const external = env.E2E_BASE_URL;
  const baseURL = external === undefined ? LOCAL_ORIGIN : externalOrigin(external);

  return defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    use: {
      baseURL,
      trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    ...(external === undefined
      ? {
          webServer: {
            command: 'pnpm preview --host 127.0.0.1 --port 4321',
            url: `${LOCAL_ORIGIN}/lessons/heart/`,
            reuseExistingServer: true,
            timeout: 120_000,
          },
        }
      : {}),
  });
}

export default resolvePlaywrightConfig(process.env);
