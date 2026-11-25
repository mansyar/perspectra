import { expect, test } from '@playwright/test';

test(
  'catalog presents two live subjects with neutral framing and no JavaScript',
  { tag: '@catalog' },
  async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Perspectra — Explore subjects in 3D');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /topic-agnostic/,
    );
    await expect(
      page.getByRole('heading', { level: 1, name: 'Explore complex ideas in 3D' }),
    ).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Learn anatomy');

    const liveLessons = page.getByRole('region', { name: 'Available lessons' });
    await expect(liveLessons.getByRole('link')).toHaveCount(2);

    const heart = liveLessons.getByRole('link', { name: /The Human Heart/ });
    await expect(heart).toContainText('Cardiovascular');
    await expect(heart).toHaveAttribute('href', '/lessons/heart');

    const earth = liveLessons.getByRole('link', { name: /Inside Earth/ });
    await expect(earth).toContainText('Earth Science');
    await expect(earth).toHaveAttribute('href', '/lessons/earth-interior');
    await expect(liveLessons.getByText('earth-science', { exact: true })).toHaveCount(0);

    await expect(page.locator('script')).toHaveCount(0);
  },
);
