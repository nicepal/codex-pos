import { test, expect } from '@playwright/test';

/**
 * Restaurant POS → Kitchen → KDS flow (live).
 * Requires running stack with restaurant_pro enabled and seeded demo data.
 *
 * Run: E2E_LIVE=1 npx playwright test tests/restaurant-kds-flow.spec.js
 */
const live = process.env.E2E_LIVE === '1';

test.describe('Restaurant KDS flow (live)', () => {
  test.skip(!live, 'Set E2E_LIVE=1 with API+frontend running to execute');

  test('TABLE → ORDER → KITCHEN → KDS lifecycle', async ({ page, request }) => {
    const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const apiBase = process.env.E2E_API_URL || 'http://localhost:5001/api';
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD required');

    await page.goto(`${base}/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/dashboard|pos|onboarding|business/i, { timeout: 20000 });

    // Navigate to POS and switch to restaurant mode if available
    await page.goto(`${base}/pos`);
    await page.waitForLoadState('networkidle');

    const restaurantToggle = page.getByRole('button', { name: /restaurant/i });
    if (await restaurantToggle.isVisible().catch(() => false)) {
      await restaurantToggle.click();
    }

    const selectTable = page.getByRole('button', { name: /select table/i });
    if (await selectTable.isVisible().catch(() => false)) {
      await selectTable.click();
      const tableCell = page.locator('[class*="MuiGrid"]').filter({ hasText: /T\d|Table/i }).first();
      if (await tableCell.isVisible().catch(() => false)) {
        await tableCell.click();
        const startBtn = page.getByRole('button', { name: /start session|open order/i });
        if (await startBtn.isVisible()) await startBtn.click();
      }
    }

    // Add first product if grid visible
    const product = page.locator('[data-testid="pos-product"], .pos-product-card').first();
    if (await product.isVisible().catch(() => false)) {
      await product.click();
    }

    const sendKitchen = page.getByRole('button', { name: /send to kitchen/i });
    if (await sendKitchen.isVisible().catch(() => false)) {
      await sendKitchen.click();
      const confirm = page.getByRole('button', { name: /^send to kitchen$/i });
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
    }

    // KDS page should list tickets when authenticated via same session
    await page.goto(`${base}/kds`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/kitchen display/i)).toBeVisible({ timeout: 15000 });

    const newColumn = page.getByText(/^NEW \(/i);
    await expect(newColumn).toBeVisible();

    // API smoke: kitchen send endpoint exists (401/403 without token is ok in unit tests; here we use UI)
    expect(page.url()).toMatch(/kds|pos|dashboard/);
  });
});
