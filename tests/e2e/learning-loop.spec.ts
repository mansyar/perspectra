import { expect, test, type Page } from '@playwright/test';
import { EARTH_LESSON, HEART_LESSON } from '../fixtures/lessons';

const VALID_CREDENTIAL = 'mock.credential.signature';

const LEARNING_CASES = [
  {
    ...HEART_LESSON,
    badgeName: 'Human Heart Mastery',
    correctIndex: 2,
    explanation: 'The aorta carries oxygenated blood from the left ventricle.',
    nextHotspot: 'right_ventricle',
    options: ['Left ventricle', 'Pulmonary artery', 'Aorta', 'Mitral valve'],
    quizHotspot: 'aorta',
    question: 'Which vessel carries oxygenated blood to the body?',
    tutorAnswer: 'The aorta carries oxygenated blood.',
  },
  {
    ...EARTH_LESSON,
    badgeName: 'Inside Earth Mastery',
    correctIndex: 1,
    explanation: 'The liquid outer core is mainly iron and nickel.',
    nextHotspot: 'upper_mantle',
    options: ['Solid rock', 'Liquid iron and nickel', 'Water', 'Silicate minerals'],
    quizHotspot: 'outer_core',
    question: 'What makes up the outer core?',
    tutorAnswer: 'The outer core is liquid iron and nickel.',
  },
] as const;

type LearningCase = (typeof LEARNING_CASES)[number];

function masteryView(lesson: LearningCase, afterGrade: boolean) {
  return {
    hotspots: lesson.hotspots.map((hotspotId) => ({
      attempts: afterGrade && hotspotId === lesson.quizHotspot ? 1 : 0,
      correct: afterGrade && hotspotId === lesson.quizHotspot ? 1 : 0,
      dueAt: afterGrade && hotspotId === lesson.quizHotspot ? '2026-11-25T00:00:00.000Z' : null,
      hotspotId,
      mastery: afterGrade && hotspotId === lesson.quizHotspot ? 0.92 : 0.2,
    })),
    nextHotspot: afterGrade ? lesson.nextHotspot : lesson.hotspots[0],
    overall: afterGrade ? 0.32 : 0.2,
    updatedAt: afterGrade ? 1_700_000_000_000 : null,
    dueCards: afterGrade ? [lesson.quizHotspot] : [],
  };
}

async function mockApis(page: Page, lesson: LearningCase) {
  await page.unrouteAll();
  let graded = false;
  const masteryQueries: string[] = [];
  const badgeLessons: string[] = [];
  const citation = `${lesson.id}:${lesson.quizHotspot}:overview`;

  await page.route('**/api/auth/get-session', async (route) => {
    await route.fulfill({ json: {}, status: 200 });
  });
  await page.route('**/api/tutor', async (route) => {
    await route.fulfill({
      body: [
        `data: ${JSON.stringify({ text: lesson.tutorAnswer, type: 'delta' })}\n\n`,
        `data: ${JSON.stringify({ citations: [citation], type: 'done' })}\n\n`,
      ].join(''),
      contentType: 'text/event-stream',
      status: 200,
    });
  });
  await page.route(/\/api\/mastery(?:\?.*)?$/, async (route) => {
    masteryQueries.push(new URL(route.request().url()).searchParams.get('lessonId') ?? '');
    await route.fulfill({ json: masteryView(lesson, graded) });
  });
  await page.route('**/api/quiz/generate', async (route) => {
    await route.fulfill({
      json: {
        hotspotId: lesson.quizHotspot,
        id: 'mock-question',
        lessonId: lesson.id,
        options: lesson.options,
        question: lesson.question,
        remediationId: lesson.quizHotspot,
      },
    });
  });
  await page.route('**/api/quiz/grade', async (route) => {
    graded = true;
    await route.fulfill({
      json: {
        correct: true,
        dueCards: [lesson.quizHotspot],
        explanation: lesson.explanation,
        nextHotspot: lesson.nextHotspot,
        remediationId: lesson.quizHotspot,
      },
    });
  });
  await page.route('**/api/badge/issue', async (route) => {
    const body = route.request().postDataJSON() as { lessonId?: string };
    badgeLessons.push(body.lessonId ?? '');
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
            credentialSubject: { achievement: { name: lesson.badgeName } },
          },
          valid: true,
        },
      });
    } else {
      await route.fulfill({ json: { reason: 'invalid_signature', valid: false } });
    }
  });
  return { badgeLessons, masteryQueries };
}

for (const lesson of LEARNING_CASES) {
  test(
    `${lesson.title} catalog, tutor, quiz and badge loop stays grounded and visible`,
    { tag: '@learning-loop' },
    async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(message.text());
        }
      });
      page.on('pageerror', (error) => errors.push(error.message));
      const requests = await mockApis(page, lesson);

      await page.goto('/');
      const card = page
        .locator('.lesson-card')
        .filter({ has: page.locator(`a[href="${lesson.path}"]`) });
      await expect(card.getByRole('link', { name: lesson.title })).toBeVisible();
      await card.getByRole('link', { name: 'Open lesson' }).click();
      await expect(page.getByRole('heading', { name: lesson.title })).toBeVisible();
      await expect(page.locator('.prose')).toBeVisible();
      await expect(page.locator('section[data-mastery]')).toBeVisible();
      await expect(page.locator('.quiz-panel')).toHaveAttribute('data-quiz-hydrated', 'true');
      expect(requests.masteryQueries.every((lessonId) => lessonId === lesson.id)).toBe(true);

      await page.locator(`[data-hotspot-chip="${lesson.quizHotspot}"]`).click();
      await expect(
        page.locator(`[data-citation="${lesson.id}:${lesson.quizHotspot}:overview"]`),
      ).toBeVisible();
      await expect(page.locator('.tutor__answer')).toContainText(lesson.tutorAnswer);

      await page.getByTestId('quiz-generate').click();
      await expect(page.getByRole('radio')).toHaveCount(4);
      await page.getByTestId('quiz-option').nth(lesson.correctIndex).check();
      await page.getByTestId('quiz-submit').click();
      await expect(page.getByTestId('quiz-result')).toContainText('Correct');
      await expect(
        page.locator(`section[data-mastery] [data-mastery-hotspot="${lesson.quizHotspot}"]`),
      ).toHaveAttribute('data-mastery', '0.92');
      await expect(page.getByText(/Due cards: 1/)).toBeVisible();
      await expect(page.locator('.prose')).toBeVisible();

      const remediationLabel = lesson.quizHotspot.replaceAll('_', ' ');
      await page
        .getByRole('button', { name: new RegExp(`Review ${remediationLabel}`, 'i') })
        .click();
      await expect(page.locator('.scene-island')).toHaveAttribute(
        'data-active-hotspot',
        lesson.quizHotspot,
      );
      await expect(page.locator(`[data-hotspot="${lesson.quizHotspot}"]`).first()).toBeInViewport();

      const credential = (await page.evaluate(async (lessonId) => {
        const response = await fetch('/api/badge/issue', {
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          method: 'POST',
          body: JSON.stringify({ lessonId }),
        });
        return ((await response.json()) as { credential: string }).credential;
      }, lesson.id)) as string;
      expect(requests.badgeLessons).toEqual([lesson.id]);

      await page.goto(`/verify?credential=${encodeURIComponent(credential)}`);
      await expect(page.getByRole('status')).toContainText('Valid credential');
      await expect(page.locator('[data-verify-achievement]')).toHaveText(lesson.badgeName);
      await expect(page.locator('[data-verify-issuer]')).toHaveText('Perspectra');

      await page.goto(`/verify?credential=${encodeURIComponent(`${credential}tampered`)}`);
      await expect(page.getByRole('status')).toContainText('Invalid credential');
      expect(requests.masteryQueries.every((lessonId) => lessonId === lesson.id)).toBe(true);
      expect(errors).toEqual([]);
    },
  );
}
