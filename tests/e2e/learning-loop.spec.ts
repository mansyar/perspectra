import { expect, test, type Page } from '@playwright/test';

const VALID_CREDENTIAL = 'mock.credential.signature';

const HOTSPOTS = [
  'left_ventricle',
  'right_ventricle',
  'aorta',
  'pulmonary_artery',
  'mitral_valve',
  'aortic_valve',
] as const;

function masteryView(afterGrade: boolean) {
  return {
    hotspots: HOTSPOTS.map((hotspotId) => ({
      attempts: afterGrade && hotspotId === 'aorta' ? 1 : 0,
      correct: afterGrade && hotspotId === 'aorta' ? 1 : 0,
      dueAt: afterGrade && hotspotId === 'aorta' ? '2026-11-25T00:00:00.000Z' : null,
      hotspotId,
      mastery: afterGrade && hotspotId === 'aorta' ? 0.92 : 0.2,
    })),
    nextHotspot: afterGrade ? 'right_ventricle' : 'left_ventricle',
    overall: afterGrade ? 0.32 : 0.2,
    updatedAt: afterGrade ? 1_700_000_000_000 : null,
    dueCards: afterGrade ? ['aorta'] : [],
  };
}

async function mockApis(page: Page): Promise<void> {
  await page.unrouteAll();
  let graded = false;

  await page.route('**/api/tutor', async (route) => {
    await route.fulfill({ body: '', contentType: 'text/event-stream', status: 200 });
  });
  await page.route('**/api/mastery', async (route) => {
    await route.fulfill({ json: masteryView(graded) });
  });
  await page.route('**/api/quiz/generate', async (route) => {
    await route.fulfill({
      json: {
        hotspotId: 'aorta',
        id: 'mock-question',
        lessonId: 'heart',
        options: ['Left ventricle', 'Pulmonary artery', 'Aorta', 'Mitral valve'],
        question: 'Which vessel carries oxygenated blood to the body?',
        remediationId: 'aorta',
      },
    });
  });
  await page.route('**/api/quiz/grade', async (route) => {
    graded = true;
    await route.fulfill({
      json: {
        correct: true,
        dueCards: ['aorta'],
        explanation: 'The aorta carries oxygenated blood from the left ventricle.',
        nextHotspot: 'right_ventricle',
        remediationId: 'aorta',
      },
    });
  });
  await page.route('**/api/badge/issue', async (route) => {
    await route.fulfill({ json: { credential: VALID_CREDENTIAL, verifyPath: '/verify' } });
  });
  await page.route('**/api/badge/verify', async (route) => {
    const credential = (route.request().postDataJSON() as { credential?: string }).credential;
    if (credential === VALID_CREDENTIAL) {
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
    } else {
      await route.fulfill({ json: { reason: 'invalid_signature', valid: false } });
    }
  });
}

test(
  'catalog to quiz to badge verification stays grounded and visible',
  { tag: '@learning-loop' },
  async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await mockApis(page);

    await page.goto('/');
    await expect(page.getByRole('link', { name: /The Human Heart/ })).toBeVisible();
    await page.getByRole('link', { name: 'Open lesson' }).first().click();
    await expect(page.getByRole('heading', { name: 'The Human Heart' })).toBeVisible();
    await expect(page.locator('.prose')).toBeVisible();
    await expect(page.locator('section[data-mastery]')).toBeVisible();
    await expect(page.locator('.quiz-panel')).toHaveAttribute('data-quiz-hydrated', 'true');

    await page.getByTestId('quiz-generate').click();
    await expect(page.getByRole('radio')).toHaveCount(4);
    await page.getByTestId('quiz-option').nth(2).check();
    await page.getByTestId('quiz-submit').click();
    await expect(page.getByTestId('quiz-result')).toContainText('Correct');
    await expect(
      page.locator('section[data-mastery] [data-mastery-hotspot="aorta"]'),
    ).toHaveAttribute('data-mastery', '0.92');
    await expect(page.getByText(/Due cards: 1/)).toBeVisible();
    await expect(page.locator('.prose')).toBeVisible();

    await page.getByRole('button', { name: /Review aorta/ }).click();
    await expect(page.locator('.scene-island')).toHaveAttribute('data-active-hotspot', 'aorta');
    await expect(page.locator('[data-hotspot="aorta"]').first()).toBeInViewport();

    const credential = (await page.evaluate(async () => {
      const response = await fetch('/api/badge/issue', {
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        body: '{}',
      });
      return ((await response.json()) as { credential: string }).credential;
    })) as string;

    await page.goto(`/verify?credential=${encodeURIComponent(credential)}`);
    await expect(page.getByRole('status')).toContainText('Valid credential');
    await expect(page.locator('[data-verify-achievement]')).toHaveText('Human Heart Mastery');
    await expect(page.locator('[data-verify-issuer]')).toHaveText('Perspectra');

    await page.goto(`/verify?credential=${encodeURIComponent(`${credential}tampered`)}`);
    await expect(page.getByRole('status')).toContainText('Invalid credential');
    expect(errors).toEqual([]);
  },
);
