import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@sitransparan.rt');
    await page.getByLabel('Kata Sandi').fill('password123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('Admin RT can view resident page', async ({ page }) => {
    await page.goto('/residents');
    await expect(page.getByRole('heading', { name: 'Manajemen Warga' })).toBeVisible();
  });

  test('Admin RT can view financial ledger page', async ({ page }) => {
    await page.goto('/financial');
    await expect(page.getByRole('heading', { name: 'Transparansi Keuangan RT' })).toBeVisible();
  });
});
