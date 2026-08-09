import { test, expect } from '@playwright/test';

test.describe('Events & Budgeting', () => {
  test('Admin RT can view events page and open create event modal', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@sitransparan.rt');
    await page.getByLabel('Kata Sandi').fill('password123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    await expect(page).toHaveURL('http://localhost:3000/');

    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Daftar Kegiatan RT/RW' })).toBeVisible();
    await page.getByRole('button', { name: '+ Tambah Kegiatan' }).click();
    await expect(page.getByRole('heading', { name: /Tambah Kegiatan|Edit Kegiatan/i })).toBeVisible();
  });
});
