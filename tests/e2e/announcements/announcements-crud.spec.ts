import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Announcements — CRUD lengkap & sinkronisasi portal publik', () => {
  const ts = Date.now();
  const title = `Pengumuman E2E ${ts}`;
  const content = `Isi pengumuman uji E2E ${ts}. Kerja bakti dimajukan.`;
  const updatedTitle = `${title} (Revisi)`;

  test('admin creates a public announcement and it appears on the public portal', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/announcements');
    await expect(page.getByRole('heading', { name: 'Kelola Pengumuman & Dokumen RT/RW' })).toBeVisible();

    // CREATE
    await page.getByRole('button', { name: '+ Tambah Pengumuman' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#title').fill(title);
    await dialog.locator('#content').fill(content);
    await dialog.locator('#target').selectOption('all');
    await dialog.getByRole('button', { name: /Buat Pengumuman/ }).click();

    // Visible in internal list with Publik badge
    await expect(page.getByRole('heading', { level: 3, name: title })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Publik', { exact: true }).first()).toBeVisible();

    // PUBLIC PORTAL shows the same content without login (titles are h3 there)
    const publicPage = await page.context().newPage();
    await publicPage.goto('/public/announcements');
    await expect(publicPage.getByRole('heading', { level: 3, name: title })).toBeVisible({ timeout: 15000 });
    await publicPage.close();
  });

  test('residents-only announcement is hidden from the anonymous public portal', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/announcements');

    const internalTitle = `Pengumuman Internal E2E ${ts}`;
    await page.getByRole('button', { name: '+ Tambah Pengumuman' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#title').fill(internalTitle);
    await dialog.locator('#content').fill('Khusus warga terdaftar.');
    await dialog.locator('#target').selectOption('residents_only');
    await dialog.getByRole('button', { name: /Buat Pengumuman/ }).click();
    await expect(page.getByRole('heading', { level: 3, name: internalTitle })).toBeVisible({ timeout: 15000 });

    // Anonymous portal must NOT show it
    const publicPage = await page.context().newPage();
    await publicPage.goto('/public/announcements');
    await expect(publicPage.getByRole("heading", { level: 3, name: internalTitle })).not.toBeVisible({ timeout: 10000 });
    await publicPage.close();
  });

  test('admin edits then deletes the announcement', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/announcements');
    await expect(page.getByRole('heading', { level: 3, name: title })).toBeVisible({ timeout: 15000 });

    // EDIT
    const card = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: title }) })
      .filter({ has: page.getByRole('button', { name: 'Edit' }) })
      .filter({ has: page.getByRole('button', { name: 'Hapus' }) })
      .last();
    await card.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#title').fill(updatedTitle);
    await dialog.getByRole('button', { name: /Simpan Perubahan/ }).click();
    await expect(page.getByRole('heading', { level: 3, name: updatedTitle })).toBeVisible({ timeout: 15000 });

    // DELETE (confirm dialog)
    page.on('dialog', (d) => d.accept());
    const updatedCard = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: updatedTitle }) })
      .filter({ has: page.getByRole('button', { name: 'Hapus' }) })
      .last();
    await updatedCard.getByRole('button', { name: 'Hapus' }).click();
    await expect(page.getByRole('heading', { level: 3, name: updatedTitle })).not.toBeVisible({ timeout: 15000 });

    // Gone from the public portal too after reload
    const publicPage = await page.context().newPage();
    await publicPage.goto('/public/announcements');
    await expect(publicPage.getByRole("heading", { level: 3, name: updatedTitle })).not.toBeVisible({ timeout: 10000 });
    await publicPage.close();
  });
});
