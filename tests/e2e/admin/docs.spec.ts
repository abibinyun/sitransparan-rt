import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Admin Documentation Module (Buku Panduan RT)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Admin RT can access documentation via sidebar and URL', async ({ page }) => {
    // 1. Klik menu Buku Panduan RT di sidebar
    const navLink = page.getByRole('link', { name: /Buku Panduan RT/i }).first();
    await expect(navLink).toBeVisible();
    await navLink.click();

    // 2. Verifikasi masuk ke rute /admin/panduan
    await expect(page).toHaveURL(/.*\/admin\/panduan/);
    await expect(page.getByRole('heading', { name: /Buku Panduan & SOP Pengurus RT/i })).toBeVisible();

    // 3. Verifikasi sidebar kategori muncul
    await expect(page.getByText('Daftar Panduan')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Hak Akses & Peran Pengurus RT/i })).toBeVisible();
  });

  test('Instant live search filters articles correctly', async ({ page }) => {
    await page.goto('/admin/panduan');
    const searchInput = page.getByPlaceholder(/Cari panduan/i);
    await expect(searchInput).toBeVisible();

    // Ketik pencarian "QR"
    await searchInput.fill('QR');
    await expect(page.getByText(/Cetak Stiker QR Rumah & Reset PIN Mandiri/i).first()).toBeVisible();

    // Bersihkan pencarian
    await searchInput.fill('');
    await expect(page.getByRole('heading', { name: /Hak Akses & Peran Pengurus RT/i })).toBeVisible();
  });

  test('Mobile viewport renders responsive drawer and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/panduan');

    // Cek header dan reading pane
    await expect(page.getByRole('heading', { name: /Buku Panduan & SOP Pengurus RT/i })).toBeVisible();

    // Verifikasi drawer trigger tombol mobile muncul
    await expect(page.getByRole('button', { name: /Daftar Topik Panduan/i })).toBeVisible();

    // Verifikasi tidak ada horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBeFalsy();
  });
});
