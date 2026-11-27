import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const AUDITED_PATHS = ['/', '/lessons/heart/', '/verify/'] as const;
const TRIVIALLY_FIXABLE_RULES = new Set([
  'button-name',
  'color-contrast',
  'duplicate-id',
  'heading-order',
  'landmark-one-main',
  'link-name',
  'list',
  'region',
]);

type FocusInfo = {
  tag: string;
  testId: string | null;
  hotspotButton: string | null;
  hotspotChip: string | null;
  catalogCard: boolean;
  verifyInput: boolean;
  outline: string;
};

async function focusInfo(page: Page): Promise<FocusInfo> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return {
      catalogCard: element?.matches('a[href="/lessons/heart"]') ?? false,
      hotspotButton: element?.getAttribute('data-hotspot-button') ?? null,
      hotspotChip: element?.getAttribute('data-hotspot-chip') ?? null,
      outline: element ? getComputedStyle(element).outlineStyle : 'none',
      tag: element?.tagName ?? '',
      testId: element?.getAttribute('data-testid') ?? null,
      verifyInput: element?.matches('[data-verify-input]') ?? false,
    };
  });
}

async function blur(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/** Tabs from the document start until the predicate matches; never asserts an exact index. */
async function tabUntil(
  page: Page,
  matches: (info: FocusInfo) => boolean,
  maxTabs = 40,
): Promise<FocusInfo | null> {
  await blur(page);
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const info = await focusInfo(page);
    if (matches(info)) {
      return info;
    }
  }
  return null;
}

test(
  'axe reports no serious or critical violations on the public pages',
  { tag: '@a11y' },
  async ({ page }) => {
    for (const path of AUDITED_PATHS) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const details = JSON.stringify(results.violations, null, 2);
      const blocking = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      const fixableModerate = results.violations.filter(
        (violation) => violation.impact === 'moderate' && TRIVIALLY_FIXABLE_RULES.has(violation.id),
      );
      expect(blocking, `${path}: ${details}`).toEqual([]);
      expect(fixableModerate, `${path}: ${details}`).toEqual([]);
    }
  },
);

test(
  'keyboard focus reaches every interactive surface and buttons activate',
  { tag: '@a11y' },
  async ({ page }) => {
    let tutorRequests = 0;
    await page.route('**/api/tutor', async (route) => {
      tutorRequests += 1;
      await route.fulfill({ body: '', contentType: 'text/event-stream', status: 200 });
    });
    await page.route('**/api/quiz/generate', async (route) => {
      await route.fulfill({
        json: {
          hotspotId: 'aorta',
          id: 'a11y-question',
          lessonId: 'heart',
          options: ['A', 'B', 'C', 'D'],
          remediationId: 'aorta',
        },
      });
    });

    await page.goto('/');
    const catalog = await tabUntil(page, (info) => info.catalogCard);
    expect(catalog).not.toBeNull();
    expect(catalog?.outline).not.toBe('none');

    await page.goto('/lessons/heart/');
    await page.getByTestId('quiz-generate').click();

    const hotspot = await tabUntil(page, (info) => info.hotspotButton !== null);
    expect(hotspot?.hotspotButton).not.toBeNull();
    expect(hotspot?.outline).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.locator('.scene-island')).toHaveAttribute(
      'data-active-hotspot',
      hotspot?.hotspotButton ?? '',
    );

    const chip = await tabUntil(page, (info) => info.hotspotChip !== null);
    expect(chip).not.toBeNull();
    expect(chip?.outline).not.toBe('none');
    await page.keyboard.press('Space');
    await expect.poll(() => tutorRequests).toBeGreaterThan(0);

    const radio = await tabUntil(page, (info) => info.tag === 'INPUT');
    expect(radio).not.toBeNull();
    expect(radio?.outline).not.toBe('none');

    await page.goto('/verify/');
    await page.route('**/api/badge/verify', async (route) => {
      await route.fulfill({
        json: {
          credential: {
            issuanceDate: '2026-11-24T00:00:00.000Z',
            issuer: { name: 'Perspectra' },
            credentialSubject: { achievement: { name: 'Human Heart Mastery' } },
          },
          valid: true,
        },
      });
    });
    const verifier = await tabUntil(page, (info) => info.verifyInput);
    expect(verifier).not.toBeNull();
    expect(verifier?.outline).not.toBe('none');
    await page.keyboard.type('fixture-credential');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText('Valid credential');
  },
);

test(
  'reduced motion keeps prose and hotspot binding usable',
  { tag: '@a11y' },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/lessons/heart/');
    await expect(page.locator('.scene-island')).toHaveAttribute('data-motion', 'reduced');
    await page.locator('[data-hotspot-button="mitral_valve"]').click();
    await expect(page.locator('[data-hotspot="mitral_valve"]')).toHaveClass(/is-active/);
    await expect(page.locator('.prose')).toBeVisible();
    await expect(page.locator('.scene-island')).toHaveAttribute('data-animation-run', '0');
  },
);

test(
  'guidance is announced by controls without unsupported control hints',
  { tag: '@a11y' },
  async ({ page }) => {
    await page.goto('/lessons/heart/');
    const guidance = page.getByTestId('scene-guidance');
    await expect(guidance).toBeVisible();
    const text = (await guidance.textContent()) ?? '';
    expect(text).toMatch(/select a landmark/i);
    expect(text).toMatch(/scroll/i);
    expect(text).not.toMatch(/drag|orbit|pinch|rotate|zoom/i);
    await expect(page.locator('.scene-island__hotspots')).toHaveAttribute(
      'aria-describedby',
      'scene-guidance',
    );
    await expect(page.locator('.scene-island__start')).toHaveAttribute(
      'aria-describedby',
      'scene-guidance',
    );

    const button = await tabUntil(page, (info) => info.hotspotButton !== null);
    expect(button?.outline).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.locator('.scene-island')).toHaveAttribute(
      'data-active-hotspot',
      button?.hotspotButton ?? '',
    );
    expect((await focusInfo(page)).outline).not.toBe('none');
  },
);
