import { test, expect, Page } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD, nik16 } from '../helpers';

async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

test.describe('Resident Management — business workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin creates resident, verifies persistence after reload, edits, then deletes', async ({ page }) => {
    const ts = Date.now();
    const name = `Warga CRUD ${ts}`;
    const updatedName = `Warga CRUD Updated ${ts}`;
    const nik = nik16(ts);

    // 1. CREATE via the real form
    await page.goto('/admin/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Data Warga' })).toBeVisible();
    await page.fill('#nik', nik);
    await page.fill('#kk_number', nik);
    await page.fill('#full_name', name);
    await page.fill('#birth_place', 'Jakarta');
    await page.fill('#birth_date', '1990-01-15');
    await page.fill('#address', 'Jl. Merdeka No. 1');
    await page.fill('#rt_rw', '001/002');
    await page.fill('#phone', '081234567890');
    await page.check('#is_head_of_family');
    await page.getByRole('button', { name: 'Simpan Data' }).click();

    // Record appears in list
    await expect(page.locator('table')).toContainText(name);
    await expect(page.locator('table')).toContainText(nik);

    // 2. PERSISTENCE: survives a full reload
    await page.reload();
    await expect(page.locator('table')).toContainText(name);

    // 3. UPDATE: edit the resident and verify the persisted change after reload
    const row = page.locator('tr', { hasText: name });
    await row.getByTitle('Edit Warga').click();
    await expect(page.getByRole('heading', { name: 'Edit Data Warga' })).toBeVisible();
    await page.fill('#full_name', updatedName);
    await page.fill('#address', 'Jl. Baru No. 99');
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.locator('table')).toContainText(updatedName);

    await page.reload();
    await expect(page.locator('table')).toContainText(updatedName);

    // 4. DELETE: confirm dialog, then verify it is gone after reload
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const updatedRow = page.locator('tr', { hasText: updatedName });
    await updatedRow.getByTitle('Hapus Warga').click();
    await expect(page.locator('table')).not.toContainText(updatedName);

    await page.reload();
    await expect(page.locator('table')).not.toContainText(updatedName);
  });

  test('admin adds a family member and sees it in the expanded KK detail', async ({ page }) => {
    const ts = Date.now();
    const headName = `Kepala KK ${ts}`;
    const childName = `Anak KK ${ts}`;
    const nik = nik16(ts);

    // Create the head of family first
    await page.goto('/admin/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await page.fill('#nik', nik);
    await page.fill('#kk_number', nik);
    await page.fill('#full_name', headName);
    await page.check('#is_head_of_family');
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.locator('table')).toContainText(headName);

    // Add a family member through the family modal (anak di bawah 17 tahun tanpa NIK)
    const headRow = page.locator('tr', { hasText: headName });
    await headRow.getByTitle('Tambah Anggota Keluarga').click();
    await expect(page.getByRole('heading', { name: 'Tambah Anggota Keluarga' })).toBeVisible();
    await page.fill('#famName', childName);
    // famNik sengaja dikosongkan untuk menguji anak < 17 tahun tanpa NIK
    await page.selectOption('#famRelation', 'Anak');
    await page.fill('#famBirthDate', '2015-05-20');
    await page.getByRole('button', { name: 'Tambah Anggota' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Anggota Keluarga' })).not.toBeVisible();

    // Expand the KK detail and verify the member is listed with its relation and Tanpa NIK
    await page.locator('tr', { hasText: headName }).getByTitle('Lihat/Kelola Anggota Keluarga').click();
    const familyDetail = page
      .locator('div.rounded-lg.border.border-slate-200.bg-white.p-4')
      .filter({ hasText: 'Anggota Keluarga' })
      .first();
    await expect(familyDetail).toBeVisible();
    await expect(familyDetail.locator('table')).toContainText(childName);
    await expect(familyDetail.locator('table')).toContainText('Anak');
    await expect(familyDetail.locator('table')).toContainText('Tanpa NIK');

    // Persistence: reload keeps the family member
    await page.reload();
    await expect(page.locator('table')).toContainText(headName);
    await page.locator('tr', { hasText: headName }).getByTitle('Lihat/Kelola Anggota Keluarga').click();
    const familyDetailReload = page
      .locator('div.rounded-lg.border.border-slate-200.bg-white.p-4')
      .filter({ hasText: 'Anggota Keluarga' })
      .first();
    await expect(familyDetailReload.locator('table')).toContainText(childName);
    await expect(familyDetailReload.locator('table')).toContainText('Tanpa NIK');

    // EDIT family member
    const updatedChildName = `Anak KK Updated ${ts}`;
    await familyDetailReload.getByTitle('Edit Anggota Keluarga').click();
    await expect(page.getByRole('heading', { name: 'Edit Anggota Keluarga' })).toBeVisible();
    await page.fill('#famName', updatedChildName);
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Anggota Keluarga' })).not.toBeVisible();
    await expect(familyDetailReload.locator('table')).toContainText(updatedChildName);

    // TEST DETAIL MODAL: open full resident detail modal and verify demography + family table
    await page.locator('tr', { hasText: headName }).getByTitle('Lihat Detail Lengkap & Dokumen').click();
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog).toBeVisible();
    await expect(detailDialog).toContainText(headName);
    await expect(detailDialog).toContainText(updatedChildName);
    await page.getByRole('button', { name: 'Tutup' }).click();
    await expect(detailDialog).not.toBeVisible();

    // DELETE family member
    page.once('dialog', (dialog) => dialog.accept());
    await familyDetailReload.getByTitle('Hapus Anggota Keluarga').click();
    await expect(familyDetailReload).not.toContainText(updatedChildName);
    await expect(familyDetailReload).toContainText('Belum ada anggota keluarga terdaftar');

    // Cleanup resident
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: headName }).getByTitle('Hapus Warga').click();
    await expect(page.locator('table').first()).not.toContainText(headName);
  });

  test('search by name filters the resident list to the matching record', async ({ page }) => {
    const ts = Date.now();
    const uniqueName = `Warga Cari ${ts}`;
    const childName = `Anggota Cari ${ts}`;
    const nik = nik16(ts);
    const kk = nik16(ts + 99);

    await page.goto('/admin/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await page.fill('#nik', nik);
    await page.fill('#kk_number', kk);
    await page.fill('#full_name', uniqueName);
    await page.check('#is_head_of_family');
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.locator('table')).toContainText(uniqueName);

    // Add family member to test searching by family member name
    const headRow = page.locator('tr', { hasText: uniqueName });
    await headRow.getByTitle('Tambah Anggota Keluarga').click();
    await page.fill('#famName', childName);
    await page.selectOption('#famRelation', 'Anak');
    await page.getByRole('button', { name: 'Tambah Anggota' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Anggota Keluarga' })).not.toBeVisible();

    const searchInput = page.getByPlaceholder(/Cari kepala keluarga/i);

    // 1. Search for the exact head name
    await searchInput.fill(uniqueName);
    await expect(page.locator('tbody tr', { hasText: uniqueName })).toHaveCount(1);

    // 2. Search by NIK
    await searchInput.fill(nik);
    await expect(page.locator('tbody tr', { hasText: uniqueName })).toHaveCount(1);

    // 3. Search by KK number
    await searchInput.fill(kk);
    await expect(page.locator('tbody tr', { hasText: uniqueName })).toHaveCount(1);

    // 4. Search by Family Member name
    await searchInput.fill(childName);
    await expect(page.locator('tbody tr', { hasText: uniqueName })).toHaveCount(1);

    // Clear the search — record is still there
    await searchInput.fill('');
    await expect(page.locator('table').first()).toContainText(uniqueName);

    // Cleanup
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: uniqueName }).getByTitle('Hapus Warga').click();
    await expect(page.locator('table').first()).not.toContainText(uniqueName);
  });

  test('admin uploads KTP and KK photo, then views them in the ResidentDetailModal', async ({ page }) => {
    const ts = Date.now();
    const name = `Warga Foto ${ts}`;
    const nik = nik16(ts);

    // Create resident
    await page.goto('/admin/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await page.fill('#nik', nik);
    await page.fill('#kk_number', nik);
    await page.fill('#full_name', name);
    await page.check('#is_head_of_family');

    // Upload dummy 1x1 png image
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const ktpInput = page.locator('input#ktpInput');
    await ktpInput.setInputFiles({
      name: 'ktp-test.png',
      mimeType: 'image/png',
      buffer: dummyImageBuffer,
    });

    const kkInput = page.locator('input#kkInput');
    await kkInput.setInputFiles({
      name: 'kk-test.png',
      mimeType: 'image/png',
      buffer: dummyImageBuffer,
    });

    // Wait for upload to complete and display preview in modal form
    await expect(page.locator('img[alt="KTP"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('img[alt="KK"]')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.locator('table')).toContainText(name);

    // Open detail modal and verify KTP/KK images are rendered
    await page.locator('tr', { hasText: name }).getByTitle('Lihat Detail Lengkap & Dokumen').click();
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog).toBeVisible();
    const ktpImg = detailDialog.locator('img[alt="Foto KTP"]');
    const kkImg = detailDialog.locator('img[alt="Foto Kartu Keluarga"]');
    await expect(ktpImg).toBeVisible();
    await expect(kkImg).toBeVisible();

    // Verify images use backend proxy path /api/v1/files/ instead of raw localhost:9000
    const ktpSrc = await ktpImg.getAttribute('src');
    expect(ktpSrc).toContain('/api/v1/files/');

    await page.getByRole('button', { name: 'Tutup' }).click();
    await expect(detailDialog).not.toBeVisible();

    // Cleanup
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: name }).getByTitle('Hapus Warga').click();
    await expect(page.locator('table').first()).not.toContainText(name);
  });

  test('form validation blocks submission when required fields are missing', async ({ page }) => {
    await page.goto('/admin/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Data Warga' })).toBeVisible();

    // Leave all required fields empty and try to submit — browser validation
    // must keep the modal open (nothing submitted to the backend).
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Data Warga' })).toBeVisible();
  });
});
