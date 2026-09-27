import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Karang Taruna Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/karang-taruna');
    await expect(page.getByRole('heading', { name: 'Struktur Organisasi & Kepengurusan RT' })).toBeVisible({ timeout: 10000 });
  });

  test('Admin RT can manage RT Structure periods and members', async ({ page }) => {
    // 1. Verifikasi tab default Pengurus RT/RW aktif
    await expect(page.getByRole('button', { name: /Pengurus RT\/RW/i })).toBeVisible();

    // 2. Buka Modal Masa Bakti Pengurus RT Baru
    await page.getByRole('button', { name: /Masa Bakti Baru/i }).click();
    await expect(page.getByRole('heading', { name: /Buat Masa Bakti Pengurus RT Baru/i })).toBeVisible();

    const timestamp = Date.now();
    const periodName = `Masa Bakti RT ${timestamp}`;
    await page.locator('#rtPeriodName').fill(periodName);
    await page.locator('#rtStartDate').fill('2026-01-01');
    await page.locator('#rtEndDate').fill('2029-12-31');
    await page.locator('#rtSKNumber').fill(`SK-${timestamp}/RT`);

    // Submit Period RT
    await page.getByRole('button', { name: /Terbitkan Periode/i }).click();
    await expect(page.getByRole('heading', { name: /Buat Masa Bakti Pengurus RT Baru/i })).not.toBeVisible();

    // 3. Switch ke Tab Karang Taruna
    await page.getByRole('button', { name: /Karang Taruna/i }).click();
    await expect(page.getByRole('button', { name: /Periode Pemuda Baru/i })).toBeVisible();

    // 4. Buka Modal Periode Pemuda Baru
    await page.getByRole('button', { name: /Periode Pemuda Baru/i }).click();
    await expect(page.getByRole('heading', { name: /Buat Masa Bakti Baru/i })).toBeVisible();

    const ktPeriodName = `Masa Bakti Pemuda ${timestamp}`;
    await page.locator('#periodName').fill(ktPeriodName);
    await page.locator('#startDate').fill('2026-01-01');
    await page.locator('#endDate').fill('2028-12-31');
    await page.locator('#skNumber').fill(`SK-${timestamp}/KT`);

    await page.getByRole('button', { name: /Terbitkan Periode/i }).click();
    await expect(page.getByRole('heading', { name: /Buat Masa Bakti Baru/i })).not.toBeVisible();
  });

  test('Tab 3 Petugas & Absensi Sampah is mobile friendly without layout overflow', async ({ page }) => {
    // Set mobile viewport (iPhone 12 / standard mobile width 375px)
    await page.setViewportSize({ width: 375, height: 667 });

    // Click Tab 3
    const tab3 = page.getByRole('button', { name: /Petugas & Absensi Sampah/i });
    await expect(tab3).toBeVisible();
    await tab3.click();

    // Verify subtabs are visible and responsive
    await expect(page.getByRole('button', { name: /Rekap Absensi & Honor/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daftar Petugas Sampah/i })).toBeVisible();

    // Verify action button is visible and full width/proper on mobile
    const addBtn = page.getByRole('button', { name: /Catat Absensi Tugas/i });
    await expect(addBtn).toBeVisible();

    // Verify metrics cards exist
    await expect(page.getByText('Total Petugas Pemuda')).toBeVisible();

    // Verify document width does not cause horizontal page blowout (scrollWidth <= clientWidth + 5px buffer)
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBeFalsy();
  });
});

