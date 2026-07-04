import { expect, test } from '@playwright/test';

test('desktop dashboard loads the map, national charts and time replay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New Zealand' })).toBeVisible();
  await expect(page.getByText('Median sale price', { exact: true })).toBeVisible();
  await expect(page.getByText('HUD property sales statistics', { exact: false })).toBeVisible();
  await expect(page.getByText('MBIE Tenancy Services bond data', { exact: false })).toBeVisible();

  const caption = page.getByText('3-month rolling. Darker is cheaper', { exact: false });
  const before = await caption.textContent();

  await page.getByLabel('Month').fill('120');
  const after = await caption.textContent();
  expect(after).not.toBe(before);
});

test('mobile falls back to a region list that drives the charts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  await expect(page.getByText('Regions by latest median sale price')).toBeVisible();

  await page.getByRole('button', { name: /Auckland/ }).click();
  await expect(page.getByRole('button', { name: /^Auckland$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /Canterbury/ }).click();
  // Two selections switch to compare charts with a legend.
  await expect(page.locator('.recharts-legend-item').first()).toBeVisible();
});
