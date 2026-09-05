import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

test.describe('Audit Trail & Activity Logs', () => {
  test('admin can view human-readable audit trail and inspect event detail modal', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/audit-logs');

    await expect(page.getByRole('heading', { name: /Pengaturan Akun & Keamanan/i })).toBeVisible();
    await expect(page.getByText(/Audit Trail & Rekam Jejak/i).first()).toBeVisible();

    // Table should render headers
    await expect(page.getByRole('columnheader', { name: 'Waktu Kejadian' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Aktivitas & Keterangan' })).toBeVisible();

    // Find at least one row and click Detail
    const detailButton = page.getByRole('button', { name: /Detail/i }).first();
    await expect(detailButton).toBeVisible();
    await detailButton.click();

    // Modal pops up with technical details & payload
    await expect(page.getByRole('heading', { name: 'Rincian Rekam Jejak (Audit Log)' })).toBeVisible();
    await expect(page.getByText('Waktu Eksekusi')).toBeVisible();
    await expect(page.getByText('Payload & Data Perubahan')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Tutup' }).click();
    await expect(page.getByRole('heading', { name: 'Rincian Rekam Jejak (Audit Log)' })).not.toBeVisible();
  });
});
