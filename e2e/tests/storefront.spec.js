import { test, expect } from '@playwright/test';

test.describe('Storefront smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/store/demo');
    await expect(page.getByText(/shop|products|demo/i).first()).toBeVisible({ timeout: 10000 });
  });
});
