import { test, expect } from '@playwright/test';

test.describe('Visual regression — QA Dashboard', () => {
  test('dashboard matches baseline (full page)', async ({ page }) => {
    await page.goto('/ui');
    await expect(page.getByTestId('health-indicator')).toHaveText(/ok/i);
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('header matches baseline', async ({ page }) => {
    await page.goto('/ui');
    const header = page.getByTestId('app-header');
    await expect(header).toHaveScreenshot('dashboard-header.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});