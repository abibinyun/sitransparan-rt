import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('superadmin@platform.local');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('Admin RT can view resident page', async ({ page }) => {
    await page.goto('/residents');
    await expect(page).toHaveURL('/residents');
  });

  test('Admin RT can view financial ledger page', async ({ page }) => {
    await page.goto('/financial');
    await expect(page).toHaveURL('/financial');
  });
});
