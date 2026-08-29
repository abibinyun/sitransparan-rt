import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Bank Sampah & Karang Taruna Workflow', () => {
  test('Public portal displays Karang Taruna and Bank Sampah tabs', async ({ page }) => {
    // 1. Visit public root on default tenant
    await page.goto('http://localhost:3000/');

    // 2. Navigate to /karang-taruna
    await page.goto('http://localhost:3000/karang-taruna');
    await expect(page).toHaveURL(/.*karang-taruna/);

    // 3. Navigate to /bank-sampah
    await page.goto('http://localhost:3000/bank-sampah');
    await expect(page).toHaveURL(/.*bank-sampah/);
    await expect(page.getByText('Bank Sampah Warga & Pemuda')).toBeVisible();
    await expect(page.getByText('Gerakan Ekonomi Sirkular & Lingkungan')).toBeVisible();
  });

  test('Admin RT can access Bank Sampah dashboard, view categories, and see tabs', async ({ page }) => {
    // 1. Login as Admin RT
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'http://localhost:3000');

    // 2. Navigate to /admin/waste-bank
    await page.goto('http://localhost:3000/admin/waste-bank');
    await expect(page).toHaveURL(/.*admin\/waste-bank/);

    // 3. Verify header & KPI cards
    await expect(page.getByRole('heading', { name: 'Bank Sampah Digital' })).toBeVisible();
    await expect(page.getByText('Total Sampah Terkumpul')).toBeVisible();
    await expect(page.getByText('Total Nilai Bruto')).toBeVisible();

    // 4. Tab switching
    await page.getByRole('button', { name: 'Master Kategori & Harga' }).click();
    await expect(page.getByRole('button', { name: 'Tambah Kategori' })).toBeVisible();

    await page.getByRole('button', { name: 'Buku Tabungan KK' }).click();
    await expect(page.getByText('Kepala Keluarga')).toBeVisible();

    await page.getByRole('button', { name: 'Riwayat Setoran' }).click();
    await expect(page.getByRole('button', { name: 'Catat Setoran Warga' })).toBeVisible();
  });
});
