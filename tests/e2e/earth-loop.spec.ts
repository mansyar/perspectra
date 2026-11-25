import { randomUUID } from 'node:crypto';
import { expect, test, type BrowserContext } from '@playwright/test';
import { EARTH_LESSON } from '../fixtures/lessons';

const configuredOrigin = process.env.E2E_BASE_URL ?? '';
const productionOrigin = configuredOrigin ? new URL(configuredOrigin).origin : '';

test.use({ trace: 'off' });

test.describe('production Earth learning loop', () => {
  test.skip(
    !productionOrigin,
    'Production-only: set E2E_BASE_URL to the public http(s) origin to exercise real services.',
  );

  test(
    'Earth works against the public origin with a unique real session',
    { tag: '@production-earth' },
    async ({ browser, playwright }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      const masteryLessons: string[] = [];
      const badgeRequests: string[] = [];
      const email = `production-e2e-${randomUUID()}@example.com`;
      const password = randomUUID();
      const auth = await playwright.request.newContext({
        baseURL: productionOrigin,
        extraHTTPHeaders: { Origin: productionOrigin },
      });
      let browserContext: BrowserContext | undefined;

      try {
        const signUp = await auth.post('/api/auth/sign-up/email', {
          data: { email, name: 'Production Earth E2E', password },
        });
        expect(signUp.status()).toBe(200);
        const signOut = await auth.post('/api/auth/sign-out');
        expect(signOut.status()).toBe(200);
        const signIn = await auth.post('/api/auth/sign-in/email', {
          data: { email, password },
        });
        expect(signIn.status()).toBe(200);

        const progressResponse = await auth.get('/api/progress');
        expect(progressResponse.status()).toBe(200);
        expect((await progressResponse.json()).eventCount).toBe(0);
        const storageState = await auth.storageState();

        browserContext = await browser.newContext({ baseURL: productionOrigin, storageState });
        const page = await browserContext.newPage();
        const isFavicon = (value: string): boolean => {
          try {
            const url = new URL(value);
            return url.origin === productionOrigin && url.pathname === '/favicon.ico';
          } catch {
            return false;
          }
        };

        page.on('console', (message) => {
          if (message.type() !== 'error') {
            return;
          }
          const location = message.location().url;
          if (location && isFavicon(location) && message.text().includes('404')) {
            return;
          }
          errors.push(`console: ${message.text()}`);
        });
        page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
        page.on('request', (request) => {
          const url = new URL(request.url());
          if (url.origin !== productionOrigin) {
            return;
          }
          if (url.pathname === '/api/mastery') {
            masteryLessons.push(url.searchParams.get('lessonId') ?? '');
          }
          if (url.pathname === '/api/badge/issue') {
            badgeRequests.push(url.pathname);
          }
        });
        page.on('response', (response) => {
          const url = new URL(response.url());
          if (url.origin !== productionOrigin) {
            return;
          }
          if (url.pathname === '/favicon.ico' && response.status() === 404) {
            return;
          }
          if (response.status() >= 400) {
            errors.push(`response: ${url.pathname} HTTP ${response.status()}`);
          }
        });

        await page.goto('/');
        await expect(
          page.locator(
            '.lesson-card a[href="/lessons/heart"], .lesson-card a[href="/lessons/earth-interior"]',
          ),
        ).toHaveCount(2);
        await expect(page.locator('a[href="/lessons/heart"]')).toBeVisible();
        await expect(page.locator('a[href="/lessons/earth-interior"]')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'The Human Heart' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Inside Earth' })).toBeVisible();

        await page.goto(`${EARTH_LESSON.path}/`);
        await expect(
          page.getByRole('heading', { level: 1, name: EARTH_LESSON.title }),
        ).toBeVisible();
        await expect(page.locator('.landmarks a')).toHaveCount(EARTH_LESSON.hotspots.length);
        for (const hotspotId of EARTH_LESSON.hotspots) {
          await expect(page.locator(`.landmarks a[href="#${hotspotId}"]`)).toBeVisible();
          await expect(page.locator(`.prose [data-hotspot="${hotspotId}"]`)).toBeAttached();
        }
        await expect(page.getByTestId('tutor-disclosure')).toContainText(/AI-generated/i);
        await expect(
          page.locator(`.mastery-panel[data-lesson="${EARTH_LESSON.id}"]`),
        ).toBeVisible();
        await expect(page.locator('.quiz-panel[data-quiz-hydrated="true"]')).toBeVisible();

        await page.locator('[data-hotspot-chip="outer_core"]').click();
        await page
          .locator('#tutor-question')
          .fill('What is the outer core made of and where is it inside Earth?');
        await page.locator('.tutor__send').click();
        const tutorParagraph = page.locator('.tutor__answer p').first();
        await expect(tutorParagraph).toBeVisible();
        const tutorText = await tutorParagraph.innerText();
        expect(tutorText.trim().length).toBeGreaterThan(20);
        expect(tutorText).not.toMatch(/^Sources:/);
        const citations = page.locator('.tutor__answer [data-citation]');
        await expect(citations.first()).toBeVisible();
        const citationValues = await citations.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-citation') ?? ''),
        );
        expect(citationValues.length).toBeGreaterThan(0);
        for (const citation of citationValues) {
          const [lessonId, hotspotId, layer] = citation.split(':');
          expect(lessonId).toBe(EARTH_LESSON.id);
          expect(EARTH_LESSON.hotspots).toContain(hotspotId);
          expect(layer).toBeTruthy();
        }

        const generationResponse = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return (
            url.origin === productionOrigin &&
            url.pathname === '/api/quiz/generate' &&
            response.request().method() === 'POST' &&
            response.status() === 200
          );
        });
        await page.getByTestId('quiz-generate').click();
        const question = await (await generationResponse).json();
        expect(question.lessonId).toBe(EARTH_LESSON.id);
        expect(EARTH_LESSON.hotspots).toContain(question.hotspotId);
        expect(question.options).toHaveLength(4);
        await page.getByTestId('quiz-option').first().check();

        const gradeResponse = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return (
            url.origin === productionOrigin &&
            url.pathname === '/api/quiz/grade' &&
            response.request().method() === 'POST' &&
            response.status() === 200
          );
        });
        await page.getByTestId('quiz-submit').click();
        const graded = await (await gradeResponse).json();
        await expect(page.getByTestId('quiz-result')).toContainText(/Correct\.|Not quite\./);
        expect(
          graded.mastery.hotspots.map((item: { hotspotId: string }) => item.hotspotId).toSorted(),
        ).toEqual([...EARTH_LESSON.hotspots].toSorted());
        const expectedMastery = graded.mastery.hotspots.find(
          (item: { hotspotId: string }) => item.hotspotId === question.hotspotId,
        ).mastery;
        await expect(
          page.locator(`[data-mastery-hotspot="${question.hotspotId}"]`),
        ).toHaveAttribute('data-mastery', String(expectedMastery));

        expect(masteryLessons.length).toBeGreaterThan(0);
        expect(masteryLessons.every((lessonId) => lessonId === EARTH_LESSON.id)).toBe(true);
        expect(badgeRequests).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await auth.dispose();
        await browserContext?.close();
      }
    },
  );
});
