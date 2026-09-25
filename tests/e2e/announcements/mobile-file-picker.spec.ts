import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('AnnouncementModal Mobile File Picker Safety', () => {
  test('Modal stays open and retains form values when file input is activated and browser loses focus', async ({ page }) => {
    test.setTimeout(45000);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/announcements');
    await expect(page.getByRole('heading', { name: 'Kelola Pengumuman & Dokumen RT/RW' })).toBeVisible();

    // 1. Buka modal tambah pengumuman
    await page.getByRole('button', { name: '+ Tambah Pengumuman' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 2. Isi data formulir
    const testTitle = `Pengumuman Tes Mobile ${Date.now()}`;
    await dialog.locator('#title').fill(testTitle);
    await dialog.locator('#content').fill('Isi konten pengumuman sebelum upload gambar.');

    // 3. Simulasikan klik pada file input (buka native file picker / galeri OS)
    const fileInput = dialog.locator('#bannerInput');
    await expect(fileInput).toBeAttached();

    // Simulasikan event blur / visibilitychange / outside focus seperti saat galeri HP terbuka
    await page.evaluate(() => {
      // Dispatch blur pada window & trigger visibility hidden
      window.dispatchEvent(new Event('blur'));
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Tunggu 500ms saat galeri terbuka di HP
    await page.waitForTimeout(500);

    // 4. Verifikasi bahwa modal TIDAK reload dan TIDAK tertutup
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#title')).toHaveValue(testTitle);

    // 5. Simulasikan user kembali dari galeri (window focus & visibility visible)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    // 6. Modal tetap ada dan utuh di layar
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#title')).toHaveValue(testTitle);
  });
});
