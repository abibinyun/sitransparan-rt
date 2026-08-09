import { test, expect } from '@playwright/test';

test.describe('Aspirations & Community Needs', () => {
  test('Admin RT can view aspirations page and switch tabs', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@sitransparan.rt');
    await page.getByLabel('Kata Sandi').fill('password123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    await expect(page).toHaveURL('http://localhost:3000/');

    await page.goto('/aspirations');
    await expect(page.getByRole('heading', { name: /Manajemen Aspirasi/i })).toBeVisible();
    await page.getByRole('button', { name: 'Kebutuhan Lingkungan', exact: true }).click();
    await expect(page.getByRole('button', { name: '+ Tambah Kebutuhan Lingkungan' })).toBeVisible();
  });
});
