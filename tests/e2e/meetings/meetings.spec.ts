import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Meetings & Action Items Tracking — Business Workflows', () => {
  test('admin RT can create meeting, add decisions, add attendees, and track action items', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate to Notulen & Tindak Lanjut
    await page.goto('/meetings');
    await expect(page.getByRole('heading', { name: 'Notulen Rapat & Tindak Lanjut' })).toBeVisible({ timeout: 10000 });

    const ts = Date.now();
    const meetingTitle = `Rapat Evaluasi Keamanan ${ts}`;

    // Click "Catat Notulen Baru"
    await page.getByRole('button', { name: 'Catat Notulen Baru' }).click();

    // Fill form
    await page.getByPlaceholder('Contoh: Rapat Pleno Pemilihan Ketua RT 003').fill(meetingTitle);
    await page.getByPlaceholder('Rincian poin yang dibahas...').fill('Membahas jadwal ronda malam dan penambahan portal otomatis.');
    await page.getByRole('button', { name: 'Simpan Notulen' }).click();

    // Verify meeting card appears and click it
    const meetingCard = page.locator('div', { hasText: meetingTitle }).first();
    await expect(meetingCard).toBeVisible({ timeout: 10000 });
    await meetingCard.click();

    // Add Decision
    await page.getByRole('button', { name: '+ Tambah Keputusan' }).click();
    const decisionText = `Iuran keamanan disetujui Rp 30.000 ${ts}`;
    await page.getByPlaceholder(/Contoh: Iuran sampah disepakati/).fill(decisionText);
    await page.getByRole('button', { name: 'Simpan Keputusan' }).click();
    await expect(page.getByText(decisionText)).toBeVisible({ timeout: 10000 });

    // Add Attendee
    await page.getByRole('button', { name: '+ Tambah Peserta' }).click();
    const attendeeName = `Bpk. Sukirman ${ts}`;
    await page.getByPlaceholder('Nama warga').fill(attendeeName);
    await page.getByRole('button', { name: 'Simpan Peserta' }).click();
    await expect(page.getByText(attendeeName, { exact: false })).toBeVisible({ timeout: 10000 });

    // Switch to Action Items Tab
    await page.getByRole('button', { name: /Tracking Tugas Warga/ }).click();
    await expect(page.getByText('Matriks Tindak Lanjut (*Action Items*)')).toBeVisible();

    // Create Action Item
    await page.getByRole('button', { name: 'Tambah Tugas' }).click();
    const taskDesc = `Beli gembok portal utama ${ts}`;
    await page.getByPlaceholder('Contoh: Beli cat dan kuas untuk pos ronda').fill(taskDesc);
    await page.getByPlaceholder('Nama warga penanggung jawab').fill('Pak RT');

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/v1/action-items') && resp.request().method() === 'POST'),
      page.getByRole('button', { name: 'Simpan Tugas' }).click(),
    ]);

    // Verify task row appears
    const taskRow = page.locator('tr', { hasText: taskDesc });
    await expect(taskRow).toBeVisible({ timeout: 10000 });
    await expect(taskRow.getByText('pending')).toBeVisible();

    // Toggle status to completed
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/v1/action-items') && resp.request().method() === 'PUT'),
      taskRow.getByRole('button', { name: 'pending' }).click(),
    ]);
    await expect(taskRow.getByText('completed')).toBeVisible({ timeout: 10000 });
  });
});
