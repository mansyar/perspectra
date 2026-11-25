import { expect, test } from '@playwright/test';

const LESSONS = [
  {
    name: 'Heart',
    path: '/lessons/heart/',
    hotspotIds: [
      'left_ventricle',
      'right_ventricle',
      'aorta',
      'pulmonary_artery',
      'mitral_valve',
      'aortic_valve',
    ],
    focusId: 'pulmonary_artery',
    proseId: 'mitral_valve',
    keyboardId: 'aorta',
    reducedMotionId: 'aortic_valve',
  },
  {
    name: 'Earth interior',
    path: '/lessons/earth-interior/',
    hotspotIds: [
      'crust',
      'upper_mantle',
      'lower_mantle',
      'outer_core',
      'inner_core',
      'lithosphere',
    ],
    focusId: 'outer_core',
    proseId: 'lithosphere',
    keyboardId: 'crust',
    reducedMotionId: 'inner_core',
  },
];

async function openLesson(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('.scene-island')).toHaveAttribute('data-scene-hydrated', 'true');
}

for (const lesson of LESSONS) {
  test.describe(lesson.name, () => {
    test('scene renders six linked landmarks', { tag: '@smoke' }, async ({ page }) => {
      await openLesson(page, lesson.path);
      await expect(page.locator('.scene-island[data-active-hotspot]')).toBeVisible();
      await expect(page.locator('.landmarks a')).toHaveCount(6);
      await expect(page.locator('[data-hotspot-button]')).toHaveCount(6);
      await expect
        .poll(async () => {
          return page.locator('.scene-island').getAttribute('data-renderer');
        })
        .toMatch(/webgpu|webgl|poster/);
      const poster = page.locator('.scene-island__poster');
      const canvas = page.locator('.scene-island canvas');
      await expect
        .poll(async () => {
          return (await poster.count()) + (await canvas.count());
        })
        .toBeGreaterThan(0);
      for (const id of lesson.hotspotIds) {
        await expect(page.locator(`[data-hotspot="${id}"]`)).toBeVisible();
      }
    });

    test('keeps the poster until the learner opts into 3D', async ({ page }) => {
      await openLesson(page, lesson.path);
      const poster = page.locator('.scene-island__poster');
      const canvas = page.locator('.scene-island canvas');
      await expect(poster).toBeVisible();
      await expect(canvas).toHaveCount(0);
      await page.locator('.scene-island__start').click();
      await expect(page.locator('.scene-island')).toHaveAttribute('data-scene-ready', 'true', {
        timeout: 20_000,
      });
      await expect(canvas).toBeVisible();
      await expect(poster).toBeHidden();
    });

    test('poster fallback when model is unavailable', async ({ page }) => {
      await page.route('**/*.glb', (route) => {
        return route.abort();
      });
      await openLesson(page, lesson.path);
      await expect(page.locator('.scene-island')).toHaveAttribute('data-renderer', 'poster');
      await expect(page.locator('.scene-island__poster')).toBeVisible();
      await expect(page.locator('.landmarks a')).toHaveCount(6);
      await expect(page.locator('[data-hotspot-button]')).toHaveCount(6);
    });

    test('scene click highlights and scrolls prose', async ({ page }) => {
      await openLesson(page, lesson.path);
      await page.locator(`[data-hotspot-button="${lesson.focusId}"]`).click();
      const section = page.locator(`[data-hotspot="${lesson.focusId}"]`);
      await expect(section).toHaveClass(/is-active/);
      await expect(page.locator('.scene-island')).toHaveAttribute(
        'data-active-hotspot',
        lesson.focusId,
      );
      await expect
        .poll(async () => {
          return section.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.top < window.innerHeight && bounds.bottom > 0;
          });
        })
        .toBe(true);
    });

    test('scrolling prose activates a hotspot', async ({ page }) => {
      await openLesson(page, lesson.path);
      await page.locator(`[data-hotspot="${lesson.proseId}"]`).scrollIntoViewIfNeeded();
      await expect(page.locator('.scene-island')).toHaveAttribute(
        'data-active-hotspot',
        lesson.proseId,
      );
      await expect(page.locator(`[data-hotspot="${lesson.proseId}"]`)).toHaveClass(/is-active/);
    });

    test('hotspots are keyboard reachable in order', async ({ page }) => {
      await openLesson(page, lesson.path);
      await page.locator('[data-hotspot-button]').first().focus();

      for (const id of lesson.hotspotIds) {
        const button = page.locator(`[data-hotspot-button="${id}"]`);
        await expect(button).toBeFocused();
        await expect(button).toHaveAttribute('type', 'button');
        await page.keyboard.press('Tab');
      }

      await page.locator(`[data-hotspot-button="${lesson.keyboardId}"]`).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.scene-island')).toHaveAttribute(
        'data-active-hotspot',
        lesson.keyboardId,
      );
    });

    test('reduced motion keeps prose usable', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openLesson(page, lesson.path);
      await expect(page.locator('.scene-island')).toHaveAttribute('data-motion', 'reduced');

      await page.locator(`[data-hotspot-button="${lesson.reducedMotionId}"]`).click();
      await expect(page.locator(`[data-hotspot="${lesson.reducedMotionId}"]`)).toHaveClass(
        /is-active/,
      );
      await expect(page.locator(`[data-hotspot="${lesson.reducedMotionId}"] p`)).toHaveCount(3);
      await expect(page.locator('.scene-island')).toHaveAttribute(
        'data-active-hotspot',
        lesson.reducedMotionId,
      );
    });

    test('a failed WebGPU scene remounts on WebGL with a visible recovery', async ({ page }) => {
      await forceWebGpu(page);
      await openLesson(page, `${lesson.path}?rendererErrors=1`);
      await expect(page.locator('.scene-island')).toHaveAttribute('data-renderer', 'webgpu');
      await page.locator('.scene-island__start').click();
      await expect(page.locator('.scene-island')).toHaveAttribute('data-renderer', 'webgl');
      await expect(page.getByTestId('renderer-status')).toContainText('Retrying with webgl');
      await expect(page.locator('.scene-island canvas')).toBeVisible();
      await expect(page.locator('.scene-island__poster')).toBeHidden();
    });

    test('a second renderer failure steps down to the poster with a retry', async ({ page }) => {
      await forceWebGpu(page);
      await openLesson(page, `${lesson.path}?rendererErrors=2`);
      await expect(page.locator('.scene-island')).toHaveAttribute('data-renderer', 'webgpu');
      await page.locator('.scene-island__start').click();
      await expect(page.locator('.scene-island')).toHaveAttribute('data-renderer', 'poster');
      await expect(page.getByTestId('renderer-status')).toContainText('lesson text remains below');
      await expect(page.locator('.scene-island__poster')).toBeVisible();
      await expect(page.locator('.prose')).toBeVisible();
    });

    test('poster stays visible until the delayed GLB has loaded', async ({ page }) => {
      await page.route('**/*.glb', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
      await openLesson(page, lesson.path);
      const poster = page.locator('.scene-island__poster');
      await expect(poster).toBeVisible();
      await expect(page.locator('.scene-island__start')).toBeVisible({ timeout: 15_000 });
      await page.locator('.scene-island__start').click();
      await expect(poster).toBeVisible();
      await expect(page.locator('.scene-island')).toHaveAttribute('data-scene-ready', 'false');
      await expect(poster).toBeHidden({ timeout: 20_000 });
      await expect(page.locator('.scene-island')).toHaveAttribute('data-scene-ready', 'true');
      await expect(page.locator('.scene-island canvas')).toBeVisible();
    });
  });
}

/** Makes tier detection choose WebGPU so a forced mount error steps down to WebGL. */
async function forceWebGpu(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: { requestAdapter: async () => ({}) },
    });
  });
}
