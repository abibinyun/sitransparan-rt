import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } from '../helpers';

test.describe('Profile & Resident Dashboard', () => {
  test('Admin RT can view profile page, edit profile name & phone, and cannot alter email/role', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Buka halaman profil melalui navigasi header / URL
    await page.goto('/admin/profile');
    await expect(page).toHaveURL('/admin/profile');

    // Cek header halaman
    await expect(page.getByRole('heading', { name: 'Profil Pengguna' })).toBeVisible();

    // Verifikasi email read-only box
    await expect(page.getByText('(Email terkunci oleh sistem keamanan)')).toBeVisible();

    // Ubah nama profil
    const nameInput = page.getByPlaceholder('Nama Lengkap');
    await nameInput.fill('Admin RT Profil Test');

    // Ubah nomor hp
    const phoneInput = page.getByPlaceholder('081234567890');
    await phoneInput.fill('089876543210');

    // Submit form info profil
    await page.getByRole('button', { name: 'Simpan Perubahan Profil' }).click();

    // Verifikasi pesan sukses
    await expect(page.getByText('Informasi profil berhasil diperbarui!')).toBeVisible();

    // Refresh halaman dan pastikan nilai tersimpan
    await page.reload();
    await expect(page.getByPlaceholder('Nama Lengkap')).toHaveValue('Admin RT Profil Test');
    await expect(page.getByPlaceholder('081234567890')).toHaveValue('089876543210');
  });

  test('Ganti password menolak jika password lama salah', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/profile');

    // Isi password lama salah
    await page.getByPlaceholder('Masukkan password saat ini').fill('passwordsalah123');
    await page.getByPlaceholder('Minimal 6 karakter').fill('newpass12345');
    await page.getByPlaceholder('Ulangi password baru').fill('newpass12345');

    // Klik tombol perbarui kata sandi
    await page.getByRole('button', { name: 'Perbarui Kata Sandi' }).click();

    // Verifikasi pesan error dari backend
    await expect(page.getByText(/password saat ini tidak sesuai/i)).toBeVisible();
  });

  test('Resident can view personal dashboard with house, dues, waste bank, and aspirations', async ({ page }) => {
    const ts = Date.now();
    const email = `warga_dash_${ts}@test.local`;
    const pw = 'Password123!';

    // 1. Superadmin provisions a resident user in tenant sitransparan-rt
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await page.goto('/users');
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    await page.fill('#name', `Warga Dash ${ts}`);
    await page.fill('#email', email);
    const opt = page.locator('#tenant_id option').filter({ hasText: 'sitransparan' }).first();
    await opt.waitFor({ state: 'attached' });
    const val = await opt.getAttribute('value');
    await page.selectOption('#tenant_id', val!);
    await page.selectOption('#role', 'resident');
    await page.fill('#password', pw);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('table')).toContainText(email);

    // 2. Resident logs in
    await page.getByRole('button', { name: 'Logout' }).click();
    await login(page, email, pw);

    // 3. Kunjungi dashboard warga
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Selamat Datang,/i })).toBeVisible({ timeout: 10000 });

    // 4. Verifikasi modul-modul dashboard personal warga (data orang lain TIDAK bocor)
    const main = page.getByRole('main');
    await expect(main.getByText(/Portal Mandiri Warga RT/i)).toBeVisible();
    await expect(main.getByText(/Status Iuran KK/i)).toBeVisible();
    await expect(main.getByText(/Tabungan Sampah/i)).toBeVisible();
    await expect(main.getByText(/Usulan Saya/i)).toBeVisible();

    // Pastikan jika warga belum ditautkan KK/iuran, tidak membocorkan iuran orang lain
    await expect(main.getByText(/Belum ada riwayat pembayaran iuran yang tercatat/i)).toBeVisible();
    await expect(main.getByText(/Anda belum mengajukan usulan atau aduan lingkungan/i)).toBeVisible();

    // 5. Verifikasi sidebar navigasi khusus resident (berbeda dengan Admin RT)
    await expect(page.getByRole('link', { name: 'Dashboard Warga' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Iuran & Keuangan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aspirasi & Usulan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agenda Kegiatan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kabar & Dokumen' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tabungan Sampah' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profil Akun Saya' })).toBeVisible();

    // Menu pengurus RT & admin harus disembunyikan dari resident
    await expect(page.getByRole('link', { name: 'Kependudukan' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Pemberdayaan RT' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Pengaturan & Akun' })).not.toBeVisible();
  });
});
