import { test, expect } from '@playwright/test';

test.describe('Announcements & Public Documents', () => {
  test('Admin RT can view announcements page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@sitransparan.rt');
    await page.getByLabel('Kata Sandi').fill('password123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    await expect(page).toHaveURL('http://localhost:3000/');

    await page.goto('/announcements');
    await expect(page.getByRole('heading', { name: 'Kelola Pengumuman & Dokumen RT/RW' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Tambah Pengumuman' })).toBeVisible();
  });
});
