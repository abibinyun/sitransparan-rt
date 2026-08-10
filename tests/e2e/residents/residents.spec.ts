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
    await page.goto('/residents');
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
    page.on('dialog', (dialog) => dialog.accept());
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
    await page.goto('/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await page.fill('#nik', nik);
    await page.fill('#kk_number', nik);
    await page.fill('#full_name', headName);
    await page.check('#is_head_of_family');
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.locator('table')).toContainText(headName);

    // Add a family member through the family modal
    const headRow = page.locator('tr', { hasText: headName });
    await headRow.getByTitle('Tambah Anggota Keluarga').click();
    await expect(page.getByRole('heading', { name: 'Tambah Anggota Keluarga' })).toBeVisible();
    await page.fill('#famName', childName);
    await page.fill('#famNik', nik16(ts + 1));
    await page.selectOption('#famRelation', 'Anak');
    await page.getByRole('button', { name: 'Tambah Anggota' }).click();

    // Expand the KK detail and verify the member is listed with its relation
    await page.locator('tr', { hasText: headName }).getByTitle('Lihat/Kelola Anggota Keluarga').click();
    const familyDetail = page
      .locator('div.rounded-lg.border.border-slate-200.bg-white.p-4')
      .filter({ hasText: 'Anggota Keluarga' })
      .first();
    await expect(familyDetail).toBeVisible();
    await expect(familyDetail.locator('table')).toContainText(childName);
    await expect(familyDetail.locator('table')).toContainText('Anak');

    // Persistence: reload keeps the family member
    await page.reload();
    await expect(page.locator('table')).toContainText(headName);
    await page.locator('tr', { hasText: headName }).getByTitle('Lihat/Kelola Anggota Keluarga').click();
    const familyDetailReload = page
      .locator('div.rounded-lg.border.border-slate-200.bg-white.p-4')
      .filter({ hasText: 'Anggota Keluarga' })
      .first();
    await expect(familyDetailReload.locator('table')).toContainText(childName);

    // Cleanup
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: headName }).getByTitle('Hapus Warga').click();
    await expect(page.locator('table').first()).not.toContainText(headName);
  });

  test('search by name filters the resident list to the matching record', async ({ page }) => {
    const ts = Date.now();
    const uniqueName = `Warga Cari ${ts}`;
    const nik = nik16(ts);

    await page.goto('/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await page.fill('#nik', nik);
    await page.fill('#kk_number', nik);
    await page.fill('#full_name', uniqueName);
    // The head-of-family filter test below expects this resident to be a head
    // of family, so mark it as such at creation time.
    await page.check('#is_head_of_family');
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.locator('table')).toContainText(uniqueName);

    // Search for the exact name — only the matching row should remain
    await page.getByPlaceholder('Cari berdasarkan NAMA atau NIK...').fill(uniqueName);
    await expect(page.locator('tbody tr', { hasText: uniqueName })).toHaveCount(1);
    await expect(page.locator('table')).toContainText(nik);

    // Clear the search — record is still there
    await page.getByPlaceholder('Cari berdasarkan NAMA atau NIK...').fill('');
    await expect(page.locator('table').first()).toContainText(uniqueName);

    // Head-of-family filter: the created resident is a head of family
    // (target the filter select by its unique option text; the tenant
    // switcher also renders a select in the header)
    const headFilter = page.locator('select').filter({ hasText: 'Kepala Keluarga Saja' }).first();
    await headFilter.selectOption('true');
    await expect(page.getByText(uniqueName)).toBeVisible();
    await headFilter.selectOption('false');
    await expect(page.getByText(uniqueName)).not.toBeVisible();
    await headFilter.selectOption('all');

    // Cleanup
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: uniqueName }).getByTitle('Hapus Warga').click();
    await expect(page.locator('table').first()).not.toContainText(uniqueName);
  });

  test('form validation blocks submission when required fields are missing', async ({ page }) => {
    await page.goto('/residents');
    await page.getByRole('button', { name: 'Tambah Warga' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Data Warga' })).toBeVisible();

    // Leave all required fields empty and try to submit — browser validation
    // must keep the modal open (nothing submitted to the backend).
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Data Warga' })).toBeVisible();
  });
});
