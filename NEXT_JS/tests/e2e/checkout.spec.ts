import { test, expect } from '@playwright/test';

// Placeholder E2E tests. TODO: implement real flows when app data/fixtures are ready.
test.describe('checkout', () => {
  test.skip('happy path: add items and checkout', async ({ page }) => {
    await page.goto('/');
    // TODO: implement flow when fixtures and UI ids are defined.
    await expect(page).toHaveURL(/\//);
  });

  test.skip('fails when estoque insuficiente', async ({ page }) => {
    await page.goto('/');
    // TODO: simulate low stock and assert error.
    await expect(page).toHaveURL(/\//);
  });
});
