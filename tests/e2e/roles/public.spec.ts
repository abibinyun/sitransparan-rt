import { test, expect } from '@playwright/test';

test.describe('Role E2E: Public (Unauthenticated User)', () => {
  test('UC-PUB-01: Should access public announcements portal', async ({ page }) => {
    await page.goto('/public/announcements');
    await expect(page.getByRole('heading', { name: 'Pengumuman & Dokumen Transparansi RT' })).toBeVisible();
  });

  test('UC-PUB-02: Should access public aspirations portal', async ({ page }) => {
    await page.goto('/public/aspirations');
    await expect(page.getByText('Daftar Aspirasi Publik')).toBeVisible();
  });

  test('UC-PUB-03: Should access public events portal', async ({ page }) => {
    await page.goto('/public/events');
    await expect(page.getByRole('heading', { name: 'Jadwal & Agenda Kegiatan Warga' })).toBeVisible();
  });
});

