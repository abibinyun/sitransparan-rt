import { test, expect } from '@playwright/test';

test.describe('Role E2E: Public (Unauthenticated User)', () => {
  test('UC-PUB-01: Should access public announcements portal', async ({ page }) => {
    await page.goto('/kabar');
    await expect(page.getByRole('heading', { name: /Pengumuman & Dokumen Transparansi/ })).toBeVisible();
  });

  test('UC-PUB-02: Should access public aspirations portal', async ({ page }) => {
    await page.goto('/usulan');
    await expect(page.getByText('Daftar Aspirasi Publik')).toBeVisible();
  });

  test('UC-PUB-03: Should access public events portal', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: 'Jadwal & Agenda Kegiatan' })).toBeVisible();
  });

  test('UC-PUB-04: Should view public polls on announcements portal and redirect to login when clicking option', async ({ page }) => {
    // Pastikan ada polling terbuka
    const adminLoginRes = await page.request.post('http://127.0.0.1:8081/api/v1/auth/login', {
      data: { email: 'admin@sitransparan.rt', password: 'password123' },
    });
    const adminToken = (await adminLoginRes.json()).token;
    const pollQ = `Polling Terbuka Warga ${Date.now()}`;
    await page.request.post('http://127.0.0.1:8081/api/v1/polls', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        question: pollQ,
        options: ['Setuju Banget', 'Perlu Diskusi'],
      },
    });

    await page.goto('/kabar');
    const pollRegion = page.getByRole('region', { name: 'Polling warga' });
    await expect(pollRegion).toBeVisible();
    await expect(pollRegion.getByText(pollQ)).toBeVisible();
    await expect(pollRegion.getByText('masuk untuk memberi suara').first()).toBeVisible();

    // Klik salah satu opsi sebagai guest -> diarahkan ke login dengan returnTo
    const optionBtn = pollRegion.getByRole('button', { name: 'Setuju Banget' }).first();
    await optionBtn.click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
  });
});

