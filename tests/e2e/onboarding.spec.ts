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

test(
  'mocked 401 responses expose mastery and quiz sign-in CTAs',
  { tag: '@onboarding' },
  async ({ page }) => {
    await page.unrouteAll();
    await page.route('**/api/auth/**', (route) =>
      route.fulfill({ contentType: 'application/json', status: 404, body: '{}' }),
    );
    await page.route(/\/api\/mastery(?:\?.*)?$/, (route) =>
      route.fulfill({ contentType: 'application/json', status: 401, body: '{}' }),
    );
    await page.route('**/api/quiz/grade', (route) =>
      route.fulfill({ contentType: 'application/json', status: 401, body: '{}' }),
    );
    let generateUnauthorized = true;
    await page.route('**/api/quiz/generate', (route) => {
      if (generateUnauthorized) {
        return route.fulfill({ contentType: 'application/json', status: 401, body: '{}' });
      }
      return route.fulfill({
        json: {
          hotspotId: 'aorta',
          id: 'onboarding-question',
          lessonId: 'heart',
          options: ['Aorta', 'Vena cava'],
          question: 'Which vessel carries blood out of the left ventricle?',
          remediationId: 'aorta',
        },
      });
    });

    await page.goto('/lessons/heart');

    const masteryCta = page.locator('[data-auth-cta="mastery"]');
    await expect(masteryCta).toBeVisible();
    await expect(masteryCta).toHaveText('Sign in');
    await expect(masteryCta).toHaveAttribute('href', '/sign-in?next=%2Flessons%2Fheart%2F');
    await masteryCta.focus();
    await expect(masteryCta).toBeFocused();

    const quizCta = page.locator('[data-auth-cta="quiz"]');
    await expect(quizCta).toHaveCount(0);
    await page.getByTestId('quiz-generate').click();
    await expect(quizCta).toBeVisible();
    await expect(quizCta).toHaveText('Sign in');
    await expect(quizCta).toHaveAttribute('href', '/sign-in?next=%2Flessons%2Fheart%2F');

    generateUnauthorized = false;
    await page.getByTestId('quiz-generate').click();
    await expect(page.getByTestId('quiz-option')).toHaveCount(2);
    await page.getByTestId('quiz-option').first().check();
    await expect(quizCta).toHaveCount(0);
    await page.getByTestId('quiz-submit').click();
    await expect(quizCta).toBeVisible();
    await expect(quizCta).toHaveAttribute('href', '/sign-in?next=%2Flessons%2Fheart%2F');
  },
);

test(
  'verify page uses truthful offline copy and a secondary sample button',
  { tag: '@onboarding' },
  async ({ page }) => {
    await page.goto('/verify/');

    await expect(page.locator('.verify-fixture')).toContainText('public offline fixture');
    const text = await page.locator('body').innerText();
    expect(text).not.toContain('Static preview has no Worker API');

    const button = page.locator('[data-fixture-button]');
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/verify-fixture__button/);
    await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  },
);

test(
  'coming-soon labels are separated from the topic on desktop and mobile',
  { tag: '@onboarding' },
  async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('.lesson-card--placeholder');
    await expect(cards).toHaveCount(3);

    async function expectSeparation(): Promise<void> {
      for (const card of await cards.all()) {
        const badge = card.locator('.lesson-card__badge');
        await expect(badge).toHaveCSS('display', 'block');
        await expect(badge).toHaveCSS('margin-bottom', '8px');
        const badgeBox = await badge.boundingBox();
        const topicBox = await card.locator('.lesson-card__topic').boundingBox();
        expect((topicBox?.y ?? 0) - ((badgeBox?.y ?? 0) + (badgeBox?.height ?? 0))).toBeGreaterThan(
          0,
        );
      }
    }

    await expectSeparation();
    await page.setViewportSize({ width: 360, height: 720 });
    await expectSeparation();
  },
);
