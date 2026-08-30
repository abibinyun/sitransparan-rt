import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('House QR Sticker & Citizen Claim Access Workflow', () => {
  test('Admin RT can manage houses and citizen can claim QR access session', async ({ page }) => {
    // 1. Login sebagai Admin RT
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL('/admin');

    // 2. Klik menu navigasi Stiker QR Rumah di sidebar
    await page.getByRole('link', { name: 'Stiker QR Rumah' }).click();
    await expect(page).toHaveURL('/admin/houses');
    await expect(page.getByRole('heading', { name: 'Stiker QR Rumah Warga' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Mekanisme akses pintar 1 Rumah = 1 Token')).toBeVisible();

    // 3. Tambah Rumah Baru
    const blockNo = `Blok T-${Date.now()}`;
    await page.getByRole('button', { name: 'Tambah Rumah' }).click();
    await expect(page.getByText('Daftarkan Rumah Baru')).toBeVisible();

    await page.getByPlaceholder('Contoh: Blok A1 No. 05').fill(blockNo);
    await page.getByPlaceholder('Contoh: Jl. Melati Raya RT 05').fill('Jl. Mawar Indah');
    await page.getByRole('button', { name: 'Simpan & Buat QR' }).click();

    // 4. Verifikasi rumah baru muncul di daftar tabel
    await expect(page.getByText(blockNo)).toBeVisible({ timeout: 10000 });

    // 5. Buka Modal Cetak Lembar Stiker
    await page.getByRole('button', { name: 'Cetak Lembar Stiker' }).click();
    await expect(page.getByText('Pratinjau Lembar Cetak Stiker QR')).toBeVisible();
    await expect(page.getByText(blockNo).first()).toBeVisible();
    await page.getByRole('button', { name: 'Tutup' }).click();

    // 6. Salin Tautan Akses Warga
    const copyBtn = page.locator('tr', { hasText: blockNo }).getByTitle('Salin Tautan Akses Warga');
    await copyBtn.click();
    await expect(page.getByText('Tersalin')).toBeVisible();

    // Ambil token dari backend API untuk claim test
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const apiRes = await page.request.get('http://127.0.0.1:8081/api/v1/admin/houses', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();
    const targetHouse = data.data.find((h: any) => h.block_number === blockNo);
    expect(targetHouse).toBeDefined();

    // 7. Buka tautan claim warga (simulasi scan QR)
    await page.goto(`/claim?slug=sitransparan-rt&token=${targetHouse.access_token}`);

    // 8. Verifikasi layar sukses auto-login warga
    await expect(page.getByText('Akses Berhasil Terverifikasi')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(blockNo)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buka Portal Transparansi' })).toBeVisible();

    // 9. Klik menuju portal usulan warga
    await page.getByRole('button', { name: 'Kirim Aspirasi & Usulan Warga' }).click();
    await expect(page).toHaveURL('/usulan');
    await expect(page.getByText('Daftar Aspirasi Publik')).toBeVisible({ timeout: 10000 });

    // 10. Login kembali sebagai Admin RT untuk menguji Edit & Hapus Rumah
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/houses');
    await expect(page.getByText(blockNo)).toBeVisible({ timeout: 10000 });

    // 11. Edit data rumah
    const houseRow = page.locator('tr', { hasText: blockNo });
    await houseRow.getByTitle('Edit Rumah').click();
    await expect(page.getByText('Edit Data Rumah')).toBeVisible();

    const updatedAddress = 'Jl. Anggrek No. 99 RT 03';
    await page.getByPlaceholder('Contoh: Jl. Melati Raya RT 05').fill(updatedAddress);
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

    // Verifikasi alamat terupdate di tabel
    await expect(page.getByText(updatedAddress)).toBeVisible({ timeout: 10000 });

    // 12. Hapus data rumah
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: blockNo }).getByTitle('Hapus Rumah').click();
    await expect(page.getByText(blockNo)).not.toBeVisible({ timeout: 10000 });
  });
});


