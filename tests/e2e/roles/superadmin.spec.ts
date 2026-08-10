import { test, expect } from '@playwright/test';

test.describe('Role E2E: Super Admin (Platform Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as SuperAdmin
    await page.goto('/login');
    await page.getByLabel('Email').fill('superadmin@platform.local');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();

    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('UC-SUP-01: SuperAdmin Tenant Management CRUD', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    await expect(page).toHaveURL('/superadmin/tenants');
    await expect(page.getByText('Manajemen Tenant RT')).toBeVisible();

    // Click Add Tenant Button
    await page.getByRole('button', { name: '+ Pendaftaran RT Baru' }).click();
    await expect(page.getByText('Pendaftaran RT Baru', { exact: true })).toBeVisible();

    const timestamp = Date.now();
    const tenantName = `RT 77 Super ${timestamp}`;
    const expectedSlug = `rt-77-super-${timestamp}`;
    const expectedDomain = `${expectedSlug}.openrt.local`;

    await page.getByPlaceholder('e.g. RT 01 RW 05 Melati').fill(tenantName);
    await page.getByRole('button', { name: 'Simpan Tenant' }).click();

    await expect(page.getByText(tenantName)).toBeVisible();
    await expect(page.getByText(expectedDomain)).toBeVisible();
  });

  test('UC-SUP-02: SuperAdmin Can Access Users & Create User With Selected Tenant', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: 'Manajemen Pengguna' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Tenant / RT' })).toBeVisible();

    const timestamp = Date.now();
    const testName = `Super User ${timestamp}`;
    const testEmail = `superuser_${timestamp}@test.local`;

    await page.click('button:has-text("Tambah Pengguna")');
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#phone', '089988776655');
    await page.selectOption('#role', 'admin_rt');
    await page.selectOption('#tenant_id', { index: 1 });
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Simpan")');

    await expect(page.locator('table')).toContainText(testName);
  });
});
