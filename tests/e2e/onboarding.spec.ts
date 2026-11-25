import { expect, test } from '@playwright/test';

async function mockAuthUnavailable(page: import('@playwright/test').Page): Promise<void> {
  await page.unrouteAll();
  await page.route('**/api/auth/**', (route) =>
    route.fulfill({ contentType: 'application/json', status: 404, body: '{}' }),
  );
}

test(
  'catalog header exposes four static controls and no scripts',
  { tag: '@onboarding' },
  async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header.site-header');
    await expect(header.getByRole('link', { name: 'Perspectra' })).toHaveAttribute('href', '/');
    await expect(header.getByRole('link', { name: 'Lessons', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(header.getByRole('link', { name: 'Verify', exact: true })).toHaveAttribute(
      'href',
      '/verify',
    );
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await expect(header.locator('a, button')).toHaveCount(4);
    await expect(page.locator('script')).toHaveCount(0);
  },
);

test(
  'lesson and verify headers expose navigation and a safe sign-in link',
  { tag: '@onboarding' },
  async ({ page }) => {
    await mockAuthUnavailable(page);

    for (const [path, signInHref] of [
      ['/lessons/heart', '/sign-in?next=%2Flessons%2Fheart%2F'],
      ['/verify', '/sign-in?next=%2Fverify%2F'],
    ] as const) {
      await page.goto(path);
      const header = page.locator('header.site-header');
      await expect(header.getByRole('link', { name: 'Perspectra' })).toHaveAttribute('href', '/');
      await expect(header.getByRole('link', { name: 'Lessons', exact: true })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Verify', exact: true })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
        'href',
        signInHref,
      );
    }

    await page.goto('/lessons/heart');
    await expect(page.locator('header.site-header nav a[aria-current="page"]')).toHaveText(
      'Lessons',
    );
    await page.goto('/verify');
    await expect(page.locator('header.site-header nav a[aria-current="page"]')).toHaveText(
      'Verify',
    );
  },
);

test(
  'sign-in page renders email and Google actions with a graceful offline state',
  { tag: '@onboarding' },
  async ({ page }) => {
    await mockAuthUnavailable(page);
    await page.goto('/sign-in/');

    await expect(page).toHaveTitle('Sign in — Perspectra');
    const panel = page.locator('[data-sign-in-panel]');
    await expect(panel.getByLabel('Email')).toBeVisible();
    await expect(panel.getByLabel('Password')).toBeVisible();
    await expect(panel.locator('[data-sign-in-submit]')).toHaveText('Sign in');
    await expect(panel.locator('[data-sign-up-submit]')).toHaveText('Create account');
    await expect(panel.locator('[data-google-sign-in]')).toHaveText('Continue with Google');
    await expect(panel.locator('[data-sign-in-notice]')).toContainText('unavailable');
    await expect(panel.getByRole('button', { name: /github/i })).toHaveCount(0);

    const text = (await page.locator('body').innerText()).toLowerCase();
    for (const secret of [
      'client_secret',
      'client secret',
      'better_auth_secret',
      'api_key',
      'bearer ',
    ]) {
      expect(text).not.toContain(secret);
    }
  },
);
