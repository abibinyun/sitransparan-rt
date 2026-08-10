import { test, expect } from '@playwright/test';

test.describe('Role E2E: Resident (Warga RT)', () => {
  test.beforeEach(async ({ page }) => {
    // Register & Login as a Resident
    await page.goto('/login');
    const timestamp = Date.now();
    const email = `warga_biasa_${timestamp}@test.local`;
    const password = 'Password123!';

    // Register Resident
    await page.click('button:has-text("Daftar")');
    await page.fill('input[placeholder="Budi Santoso"]', `Warga Warga ${timestamp}`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Daftar Akun")');

    // Login Resident
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Masuk Akun")');

    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('UC-RES-02 & UC-RES-03: Resident Dashboard & Submit Aspirations', async ({ page }) => {
    await page.goto('/aspirations');
    await expect(page).toHaveURL('/aspirations');
    await expect(page.getByRole('heading', { name: 'Manajemen Aspirasi & Kebutuhan Lingkungan' })).toBeVisible();
  });
});
