import { test, expect } from '@playwright/test';

test.describe('QA Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui');
  });

  test('page loads with the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/QA Quality Platform/i);
  });

  test('shows the platform heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /QA Quality Platform/i })).toBeVisible();
  });

  test('health indicator turns green', async ({ page }) => {
    const indicator = page.getByTestId('health-indicator');
    await expect(indicator).toHaveText(/ok/i, { timeout: 5000 });
  });

  test('pet list renders rows from the API', async ({ page }) => {
    const rows = page.getByTestId('pet-row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('refresh button reloads the list', async ({ page }) => {
    await page.getByRole('button', { name: /refresh/i }).click();
    await expect(page.getByTestId('pet-row').first()).toBeVisible();
  });
});