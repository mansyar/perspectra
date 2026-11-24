import { expect, test, type Page } from '@playwright/test';

const SSE = [
  `data: ${JSON.stringify({ type: 'delta', text: 'The aorta carries oxygenated blood. ' })}\n\n`,
  `data: ${JSON.stringify({ type: 'delta', text: '[[heart:aorta:overview]]' })}\n\n`,
  `data: ${JSON.stringify({ type: 'done', citations: ['heart:aorta:overview'] })}\n\n`,
].join('');

async function mockTutor(page: Page, capture?: (body: string) => void): Promise<void> {
  await page.unrouteAll();
  await page.route('**/api/tutor', async (route) => {
    capture?.(route.request().postData() ?? '');
    await route.fulfill({ body: SSE, contentType: 'text/event-stream', status: 200 });
  });
}

test.beforeEach(async ({ page }) => {
  await mockTutor(page);
  await page.goto('/lessons/heart/');
});

test(
  'shows AI disclosure and privacy note before first use',
  { tag: '@tutor' },
  async ({ page }) => {
    await expect(page.getByTestId('tutor-disclosure')).toBeVisible();
    await expect(page.getByTestId('tutor-privacy')).toBeVisible();
    await expect(page.getByTestId('tutor-answer')).toBeEmpty();
  },
);

test('chip click sends the hotspot id in the request body', { tag: '@tutor' }, async ({ page }) => {
  let sent = '';
  await mockTutor(page, (body) => {
    sent = body;
  });
  await page.locator('[data-hotspot-chip="aorta"]').click();
  await expect.poll(() => sent).toContain('"activeHotspot":"aorta"');
  expect(JSON.parse(sent)).toMatchObject({ lessonId: 'heart', question: 'Explain Aorta.' });
});

test(
  'citation click scrolls prose and updates active hotspot',
  { tag: '@tutor' },
  async ({ page }) => {
    await page.locator('[data-hotspot-chip="aorta"]').click();
    const citation = page.locator('[data-citation="heart:aorta:overview"]').first();
    await expect(citation).toBeVisible();
    await citation.click();
    await expect(page.locator('.scene-island')).toHaveAttribute('data-active-hotspot', 'aorta');
    await expect(page.locator('[data-hotspot="aorta"]')).toBeInViewport();
  },
);
