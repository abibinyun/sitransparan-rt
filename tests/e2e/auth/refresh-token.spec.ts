import { test, expect } from '@playwright/test';

test.describe('Refresh Token & Sesi Revocation', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test('Login menghasilkan token & refresh_token di storage', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByPlaceholder(/email/i).fill('admin@sitransparan.rt');
    await page.getByPlaceholder(/kata sandi|password/i).fill('password123');
    await page.getByRole('button', { name: /masuk/i }).click();

    // Tunggu dashboard
    await expect(page).toHaveURL(/.*\/admin/);

    // Verifikasi auth_token dan refresh_token tersimpan di localStorage
    const hasToken = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const tokenKey = keys.find((k) => k.includes('auth_token'));
      const refreshKey = keys.find((k) => k.includes('refresh_token'));
      return {
        token: !!tokenKey && !!localStorage.getItem(tokenKey!),
        refreshToken: !!refreshKey && !!localStorage.getItem(refreshKey!),
      };
    });

    expect(hasToken.token).toBe(true);
    expect(hasToken.refreshToken).toBe(true);
  });
});
