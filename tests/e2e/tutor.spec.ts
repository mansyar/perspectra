import { expect, test, type Page } from '@playwright/test';

const SSE = [
  `data: ${JSON.stringify({ type: 'delta', text: 'The aorta carries oxygenated blood. ' })}\n\n`,
  `data: ${JSON.stringify({ type: 'delta', text: '[[heart:aorta:overview]]' })}\n\n`,
  `data: ${JSON.stringify({
    citations: ['heart:aorta:overview'],
    scopeLabel: 'Aorta',
    type: 'done',
  })}\n\n`,
].join('');

interface TutorRequest {
  activeHotspot?: string | null;
  history?: { content: string; role: string }[];
}

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
  await expect(page.locator('.tutor')).toHaveAttribute('data-tutor-hydrated', 'true');
  await expect(page.getByTestId('tutor-context')).toContainText('Whole lesson');
  await page.locator('[data-hotspot-chip="aorta"]').click();
  await expect.poll(() => sent).toContain('"activeHotspot":"aorta"');
  expect(JSON.parse(sent)).toMatchObject({ lessonId: 'heart', question: 'Explain Aorta.' });
  await expect(page.getByTestId('tutor-context')).toContainText('Aorta');
  await expect(page.getByTestId('tutor-scope')).toContainText('Aorta');
});

test(
  'new questions follow the latest focus while keeping history',
  { tag: '@tutor' },
  async ({ page }) => {
    const requests: TutorRequest[] = [];
    await mockTutor(page, (body) => {
      requests.push(JSON.parse(body) as TutorRequest);
    });
    await expect(page.locator('.tutor')).toHaveAttribute('data-tutor-hydrated', 'true');
    await page.locator('[data-hotspot-chip="aorta"]').click();
    await expect.poll(() => requests.length).toBe(1);
    await page.locator('[data-hotspot-chip="mitral_valve"]').click();
    await expect.poll(() => requests.length).toBe(2);
    await page.getByRole('textbox', { name: 'Your question' }).fill('How does it work?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect.poll(() => requests.length).toBe(3);
    expect(requests[2]?.activeHotspot).toBe('mitral_valve');
    expect(requests[2]?.history?.length).toBeGreaterThan(0);
  },
);

test(
  'citation click scrolls prose and updates active hotspot',
  { tag: '@tutor' },
  async ({ page }) => {
    await expect(page.locator('.tutor')).toHaveAttribute('data-tutor-hydrated', 'true');
    await page.locator('[data-hotspot-chip="aorta"]').click();
    const citation = page.locator('[data-citation="heart:aorta:overview"]').first();
    await expect(citation).toBeVisible();
    await citation.click();
    await expect(page.locator('.scene-island')).toHaveAttribute('data-active-hotspot', 'aorta');
    await expect(page.locator('[data-hotspot="aorta"]')).toBeInViewport();
  },
);

for (const viewport of [
  { height: 800, width: 1280 },
  { height: 768, width: 1024 },
]) {
  test.describe(`sticky dock at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test(
      'keeps question, focus label and answer in view after scrolling the prose',
      { tag: '@tutor' },
      async ({ page }) => {
        await expect(page.locator('.tutor')).toHaveAttribute('data-tutor-hydrated', 'true');
        await page.locator('[data-hotspot-chip="aorta"]').click();
        await expect(page.getByTestId('tutor-answer')).toContainText('oxygenated blood');
        await expect(page.getByTestId('tutor-context')).toContainText('Aorta');

        const dockBox = await page.locator('.tutor').boundingBox();
        const proseBox = await page.locator('.prose').boundingBox();
        expect(dockBox).not.toBeNull();
        expect(proseBox).not.toBeNull();
        expect(dockBox?.x ?? 0).toBeGreaterThanOrEqual(
          (proseBox?.x ?? 0) + (proseBox?.width ?? 0),
        );

        await page.locator('.prose > div').last().scrollIntoViewIfNeeded();
        await expect(page.getByRole('textbox', { name: 'Your question' })).toBeInViewport();
        await expect(page.getByTestId('tutor-context')).toBeInViewport();
        await expect(page.getByTestId('tutor-answer')).toBeInViewport();
      },
    );
  });
}

test.describe('mobile tutor sheet at 390x844', () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test(
    'collapses behind Ask, opens a sheet and closes on Escape with keyboard focus',
    { tag: '@tutor' },
    async ({ page }) => {
      const toggle = page.getByTestId('tutor-toggle');
      const sheet = page.locator('.tutor__body');
      const textarea = page.getByRole('textbox', { name: 'Your question' });

      await expect(toggle).toBeVisible();
      await expect(sheet).toBeHidden();

      await toggle.click();
      await expect(sheet).toBeVisible();
      await expect(textarea).toBeFocused();
      await expect(textarea).toBeInViewport();

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(toggle).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(sheet).toBeVisible();
      await expect(textarea).toBeFocused();
    },
  );
});
