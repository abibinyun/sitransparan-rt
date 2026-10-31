import { test, expect } from '@playwright/test';

test.describe('Ekosistem Komunitas, Notifikasi & Pusat Keamanan Warga', () => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login sebagai Admin RT
    await page.goto(`${baseURL}/login`);
    await page.getByPlaceholder(/email/i).fill('admin@sitransparan.rt');
    await page.getByPlaceholder(/kata sandi|password/i).fill('password123');
    await page.getByRole('button', { name: /masuk/i }).click();
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('Lonceng Notifikasi in-app dapat dibuka dan menampilkan kotak masuk', async ({ page }) => {
    // Cari tombol lonceng notifikasi di header
    const bellButton = page.locator('button[aria-label="Kotak Masuk Notifikasi"]');
    await expect(bellButton).toBeVisible();
    await bellButton.click();

    // Modal kotak masuk terbuka
    await expect(page.getByText('Kotak Masuk Notifikasi')).toBeVisible();
  });

  test('Halaman Ruang Warga (/community) dapat dibuka dan menampilkan filter tab serta tombol buat kiriman', async ({ page }) => {
    await page.goto(`${baseURL}/community`);
    await expect(page).toHaveURL(/.*\/community/);

    // Header dan tombol aksi
    await expect(page.getByText('Ruang Warga & Lapak UMKM')).toBeVisible();
    const createBtn = page.getByRole('button', { name: /buat kiriman/i });
    await expect(createBtn).toBeVisible();

    // Tab filter
    await expect(page.getByRole('button', { name: /semua/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /lapak/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tanya/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /obrolan/i })).toBeVisible();

    // Buka modal buat kiriman dan pastikan input upload foto tersedia
    await createBtn.click();
    await expect(page.getByText('Buat Kiriman Warga')).toBeVisible();
    await expect(page.getByText(/lampirkan foto/i)).toBeVisible();
  });
});
