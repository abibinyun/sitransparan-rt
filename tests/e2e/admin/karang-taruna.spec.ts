import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Karang Taruna Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/karang-taruna');
    await expect(page.getByRole('heading', { name: /Karang Taruna/i })).toBeVisible({ timeout: 10000 });
  });

  test('Admin RT can view structure, create period, and configure sections', async ({ page }) => {
    // 1. Switch to Masa Bakti tab
    await page.getByRole('button', { name: /Masa Bakti/i }).click();

    // 2. Open Create Period Modal
    await page.getByRole('button', { name: /Periode Baru/i }).click();
    await expect(page.getByRole('heading', { name: /Buat Masa Bakti Baru/i })).toBeVisible();

    const timestamp = Date.now();
    const periodName = `Masa Bakti E2E ${timestamp}`;
    await page.getByLabel('Nama Periode').fill(periodName);
    await page.getByLabel('Nomor SK').fill(`SK-${timestamp}/KT`);

    // Submit Period
    await page.getByRole('button', { name: /Terbitkan Periode/i }).click();
    await expect(page.getByText(periodName).first()).toBeVisible({ timeout: 10000 });

    // 3. Switch to Config tab
    await page.getByRole('button', { name: /Konfigurasi Seksi/i }).click();
    await expect(page.getByText(/Konfigurasi Bidang & Seksi Pemuda/i)).toBeVisible();

    const newSection = `Divisi E-Sport ${timestamp}`;
    await page.getByPlaceholder(/Tambah nama seksi/i).fill(newSection);
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
    await expect(page.getByText(newSection)).toBeVisible();

    // Save configuration
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Simpan Konfigurasi/i }).click();
  });
});
