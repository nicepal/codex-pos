import { test, expect } from '@playwright/test';

const live = process.env.E2E_LIVE === '1';

test.describe('Storefront smoke', () => {
  test.skip(!live, 'Set E2E_LIVE=1 with frontend running to execute');

  test('home page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/store/demo');
    await expect(page.getByText(/shop|products|demo/i).first()).toBeVisible({ timeout: 10000 });
  });
});
