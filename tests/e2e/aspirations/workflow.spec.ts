import { test, expect, Page } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Aspirations & Community Needs — business workflows', () => {
  test('public submit → admin responds → public sees status and official response', async ({ page }) => {
    const ts = Date.now();
    const title = `ASPIRASI E2E ${ts}`;
    const content = `Isi aspirasi E2E ${ts} tentang lingkungan`;
    const responseText = `Terima kasih atas masukannya (E2E ${ts})`;

    // 1. Public (unauthenticated) submits an aspiration
    await page.goto('/public/aspirations');
    await page.getByRole('button', { name: 'Buat Aspirasi Baru' }).click();
    await expect(page.getByRole('heading', { name: 'Kirim Aspirasi / Usulan / Keluhan' })).toBeVisible();
    await page.fill('#aspTitle', title);
    await page.selectOption('#aspCategory', 'suggestion');
    await page.fill('#aspContent', content);
    await page.getByRole('button', { name: 'Kirim Aspirasi' }).click();

    // The aspiration shows up in the public list as "Terkirim"
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('Terkirim').first()).toBeVisible();

    // 2. Admin logs in and processes the aspiration (status transition + response)
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/aspirations');
    await expect(page.getByRole('heading', { name: /Manajemen Aspirasi/i })).toBeVisible();

    const item = page.locator('div.p-6').filter({ hasText: title }).first();
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: 'Tanggapi' }).click();
    await expect(page.getByRole('heading', { name: 'Tanggapi Aspirasi Warga' })).toBeVisible();

    await page.selectOption('#aspirationStatus', 'resolved');
    await page.fill('#aspirationResponse', responseText);
    await page.getByRole('button', { name: 'Simpan Tanggapan' }).click();

    // Reload to verify the status change persisted on the server
    await page.reload();
    const processed = page.locator('div.p-6').filter({ hasText: title }).first();
    await expect(processed).toContainText('Selesai');
    await expect(processed).toContainText('Tanggapan Pengurus:');
    await expect(processed).toContainText(responseText);

    // 3. Logout and verify the public portal reflects the resolved status + response
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.goto('/public/aspirations');
    const publicCard = page.locator('div.rounded-2xl').filter({ hasText: title }).first();
    await expect(publicCard).toContainText('Selesai / Ditindaklanjuti');
    await expect(publicCard).toContainText('Tanggapan Resmi Pengurus RT:');
    await expect(publicCard).toContainText(responseText);
  });

  test('admin creates a community need and updates its status with progress notes', async ({ page }) => {
    const ts = Date.now();
    const needTitle = `Kebutuhan E2E ${ts}`;
    const notes = `Progres E2E ${ts}`;

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/aspirations');
    await page.getByRole('button', { name: 'Kebutuhan Lingkungan', exact: true }).click();
    await page.getByRole('button', { name: '+ Tambah Kebutuhan Lingkungan' }).click();

    await page.fill('#needTitle', needTitle);
    await page.fill('#needDescription', 'Perbaikan fasilitas umum');
    await page.fill('#needEstimatedCost', '2500000');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();

    // Card appears with estimated cost and "Diusulkan" status
    const card = page.locator('div.rounded-xl').filter({ hasText: needTitle }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Diusulkan');
    await expect(card).toContainText('Rp 2.500.000');

    // Update status to approved with progress notes
    await card.getByRole('button', { name: 'Edit / Update Status' }).click();
    await page.selectOption('#needStatus', 'approved');
    await page.fill('#needProgressNotes', notes);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();

    const updated = page.locator('div.rounded-xl').filter({ hasText: needTitle }).first();
    await expect(updated).toContainText('Disetujui');
    await expect(updated).toContainText(notes);

    // Persistence after reload (switch back to the needs tab first)
    await page.reload();
    await page.getByRole('button', { name: 'Kebutuhan Lingkungan', exact: true }).click();
    await expect(page.locator('div.rounded-xl').filter({ hasText: needTitle }).first()).toContainText('Disetujui');
    await expect(page.getByText(notes)).toBeVisible();
  });
});
