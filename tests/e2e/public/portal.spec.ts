import { test, expect } from '@playwright/test';

test.describe('Public Transparency Portal', () => {
  test('Unauthenticated user can view public announcements', async ({ page }) => {
    await page.goto('/public/announcements');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Pengumuman & Dokumen/i);
  });

  test('Unauthenticated user can view public events', async ({ page }) => {
    await page.goto('/public/events');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Jadwal & Agenda/i);
  });

  test('Unauthenticated user can view public aspirations', async ({ page }) => {
    await page.goto('/public/aspirations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Aspirasi & Kebutuhan/i);
  });
});
