import { expect, test } from '@playwright/test';

const HOTSPOT_IDS = [
  'left_ventricle',
  'right_ventricle',
  'aorta',
  'pulmonary_artery',
  'mitral_valve',
  'aortic_valve',
];

test('scene renders six linked landmarks', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/lessons/heart/');
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
  for (const id of HOTSPOT_IDS) {
    await expect(page.locator(`[data-hotspot="${id}"]`)).toBeVisible();
  }
});

test('poster fallback when model is unavailable', async ({ page }) => {
  await page.route('**/*.glb', (route) => {
    return route.abort();
  });
  await page.goto('/lessons/heart/');
  await expect(page.locator('.scene-island')).toHaveAttribute('data-renderer', 'poster');
  await expect(page.locator('.scene-island__poster')).toBeVisible();
  await expect(page.locator('.landmarks a')).toHaveCount(6);
  await expect(page.locator('[data-hotspot-button]')).toHaveCount(6);
});

test('scene click highlights and scrolls prose', async ({ page }) => {
  await page.goto('/lessons/heart/');
  await page.locator('[data-hotspot-button="pulmonary_artery"]').click();
  const section = page.locator('[data-hotspot="pulmonary_artery"]');
  await expect(section).toHaveClass(/is-active/);
  await expect(page.locator('.scene-island')).toHaveAttribute(
    'data-active-hotspot',
    'pulmonary_artery',
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
  await page.goto('/lessons/heart/');
  await page.locator('[data-hotspot="mitral_valve"]').scrollIntoViewIfNeeded();
  await expect(page.locator('.scene-island')).toHaveAttribute(
    'data-active-hotspot',
    'mitral_valve',
  );
  await expect(page.locator('[data-hotspot="mitral_valve"]')).toHaveClass(/is-active/);
});

test('hotspots are keyboard reachable in order', async ({ page }) => {
  await page.goto('/lessons/heart/');
  await page.locator('[data-hotspot-button]').first().focus();

  for (const id of HOTSPOT_IDS) {
    const button = page.locator(`[data-hotspot-button="${id}"]`);
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('type', 'button');
    await page.keyboard.press('Tab');
  }

  await page.locator('[data-hotspot-button="aorta"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.scene-island')).toHaveAttribute('data-active-hotspot', 'aorta');
});

test('reduced motion keeps prose usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lessons/heart/');
  await expect(page.locator('.scene-island')).toHaveAttribute('data-motion', 'reduced');

  await page.locator('[data-hotspot-button="aortic_valve"]').click();
  await expect(page.locator('[data-hotspot="aortic_valve"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-hotspot="aortic_valve"] p')).toHaveCount(3);
  await expect(page.locator('.scene-island')).toHaveAttribute(
    'data-active-hotspot',
    'aortic_valve',
  );
});
