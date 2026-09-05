import { test, expect } from '@playwright/test';

test.describe('Public Transparency Portal', () => {
  test('Unauthenticated user can view public announcements', async ({ page }) => {
    await page.goto('/kabar');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Pengumuman & Dokumen/i);
  });

  test('Unauthenticated user can view public events', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Agenda Kegiatan/i);
  });

  test('Unauthenticated user can view public aspirations', async ({ page }) => {
    await page.goto('/usulan');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Aspirasi & Kebutuhan/i);
  });
});
