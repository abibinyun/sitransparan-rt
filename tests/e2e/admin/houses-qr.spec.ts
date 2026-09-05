import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('House QR Sticker & Citizen Claim Access Workflow', () => {
  test('Admin RT can manage houses and citizen can claim QR access session', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Login sebagai Admin RT
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL('/admin');

    // 2. Akses halaman Stiker QR Rumah
    await page.goto('/admin/houses');
    await expect(page).toHaveURL('/admin/houses');
    await expect(page.getByRole('heading', { name: 'Kependudukan & Wilayah' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Cara Kerja Stiker QR Rumah:')).toBeVisible();

    // 3. Tambah Rumah Baru
    const blockNo = `Blok T-${Date.now()}`;
    await page.getByRole('button', { name: 'Tambah Rumah' }).click();
    await expect(page.getByText('Daftarkan Rumah Baru')).toBeVisible();

    await page.getByPlaceholder(/Contoh: .*Blok A1 No\. 05/).fill(blockNo);
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

    // Verifikasi sesi auth di localStorage memiliki user asli (bukan house ID semata)
    const claimedAuth = await page.evaluate(() => {
      const userStr = localStorage.getItem('auth_user');
      return userStr ? JSON.parse(userStr) : null;
    });
    expect(claimedAuth).toBeDefined();
    expect(claimedAuth.email).toContain('@warga.local');
    expect(claimedAuth.role).toBe('resident');

    // 9. Klik menuju portal usulan warga dan kirim aspirasi menggunakan identitas real user terverifikasi
    await page.getByRole('button', { name: 'Kirim Aspirasi & Usulan Warga' }).click();
    await expect(page).toHaveURL('/usulan');
    await expect(page.getByText('Daftar Aspirasi Publik')).toBeVisible({ timeout: 10000 });

    // Coba kirim usulan warga
    await page.getByRole('button', { name: 'Sampaikan Aspirasi Baru' }).click();
    await expect(page.getByText('Kirim Aspirasi / Usulan / Keluhan')).toBeVisible();
    await page.getByPlaceholder('Judul aspirasi...').fill(`Perbaikan Selokan ${blockNo}`);
    await page.getByPlaceholder('Jelaskan aspirasi atau keluhan Anda...').fill(`Mohon bantuan perbaikan selokan di depan ${blockNo}`);
    await page.getByRole('button', { name: 'Kirim Aspirasi' }).click();
    await expect(page.getByText(`Perbaikan Selokan ${blockNo}`)).toBeVisible({ timeout: 10000 });

    // 10. Login kembali sebagai Admin RT untuk menguji Edit & Hapus Rumah
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/houses');
    await expect(page.getByText(blockNo)).toBeVisible({ timeout: 10000 });

    // 11. Edit data rumah
    const houseRow = page.locator('tr', { hasText: blockNo });
    await houseRow.getByTitle('Edit Rumah').click();
    await expect(page.getByText('Edit Data Rumah')).toBeVisible();

    const updatedAddress = `Jl. Anggrek No. ${Date.now()} RT 03`;
    await page.getByPlaceholder('Contoh: Jl. Melati Raya RT 05').fill(updatedAddress);
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

    // Verifikasi alamat terupdate di tabel
    await expect(page.locator('tr', { hasText: blockNo })).toContainText(updatedAddress);

    // 12. Regenerate Token (Reset QR)
    page.once('dialog', (dialog) => dialog.accept());
    await houseRow.getByTitle('Generate Ulang Token (Reset QR)').click();

    // Ambil token baru dari backend dan pastikan token lama tidak lagi sama
    const apiRes2 = await page.request.get('http://127.0.0.1:8081/api/v1/admin/houses', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data2 = await apiRes2.json();
    const updatedHouse = data2.data.find((h: any) => h.block_number === blockNo);
    expect(updatedHouse.access_token).not.toBe(targetHouse.access_token);

    // Coba claim dengan token lama (harus gagal)
    await page.goto(`/claim?slug=sitransparan-rt&token=${targetHouse.access_token}`);
    await expect(page.getByText('Gagal Membuka Akses Stiker QR')).toBeVisible({ timeout: 10000 });

    // Coba claim dengan token baru (harus sukses)
    await page.goto(`/claim?slug=sitransparan-rt&token=${updatedHouse.access_token}`);
    await expect(page.getByText('Akses Berhasil Terverifikasi')).toBeVisible({ timeout: 10000 });

    // 12. Test Musyawarah & Polling Warga via Sesi QR Rumah (1 Rumah = 1 Suara)
    // Buat polling via API dengan token Admin RT
    const createPollRes = await page.request.post('http://127.0.0.1:8081/api/v1/polls', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        question: `Polling Musyawarah ${blockNo}`,
        options: ['Setuju Paving Jalan', 'Tunda Musim Depan'],
      },
    });
    expect(createPollRes.status()).toBe(201);
    const pollData = await createPollRes.json();

    // Masuk ke halaman portal kabar warga (membawa widget polling)
    await page.goto('/kabar');
    const pollCard = page.locator('div', { hasText: `Polling Musyawarah ${blockNo}` }).last();
    await expect(pollCard).toBeVisible({ timeout: 10000 });

    // Berikan suara via sesi QR rumah
    await pollCard.getByRole('button', { name: /Setuju Paving Jalan/i }).click();
    await expect(page.getByText('suara Anda tercatat').first()).toBeVisible({ timeout: 10000 });
    await expect(pollCard.getByRole('button', { name: /Setuju Paving Jalan — pilihan Anda/i })).toBeVisible({ timeout: 10000 });

    // 13. Login kembali sebagai Admin RT untuk Hapus data rumah
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/houses');
    await expect(page.getByText(blockNo)).toBeVisible({ timeout: 10000 });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.locator('tr', { hasText: blockNo }).getByTitle('Hapus Rumah').click();
    await expect(page.getByText(blockNo)).not.toBeVisible({ timeout: 10000 });
  });
});


