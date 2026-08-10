import { test, expect } from '@playwright/test';

test.describe('User Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as SuperAdmin
    await page.goto('/login');
    await page.getByLabel('Email').fill('superadmin@platform.local');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();

    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('should display Users Management page and list users', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/users');

    await expect(page.getByRole('heading', { name: 'Manajemen Pengguna' })).toBeVisible();
    await expect(page.getByPlaceholder('Cari nama atau email pengguna...')).toBeVisible();
  });

  test('should create, update, and delete user successfully', async ({ page }) => {
    await page.goto('/users');

    const timestamp = Date.now();
    const testName = `Warga E2E ${timestamp}`;
    const testEmail = `wargae2e_${timestamp}@test.local`;
    const updatedName = `Warga E2E Updated ${timestamp}`;

    // 1. Open Add User Modal
    await page.click('button:has-text("Tambah Pengguna")');
    await expect(page.getByRole('heading', { name: 'Tambah Pengguna' })).toBeVisible();

    // Fill form
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#phone', '081234567890');
    await page.selectOption('#role', 'resident');
    await page.fill('#password', 'Password123!');

    // Submit
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Verify User Created in Table
    await expect(page.locator('table')).toContainText(testName);
    await expect(page.locator('table')).toContainText(testEmail);

    // 2. Edit User
    const userRow = page.locator('tr', { hasText: testEmail });
    await userRow.locator('button').first().click();

    await expect(page.getByRole('heading', { name: 'Edit Pengguna' })).toBeVisible();
    await page.fill('#name', updatedName);
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Verify Updated Name
    await expect(page.locator('table')).toContainText(updatedName);

    // 3. Delete User
    const updatedRow = page.locator('tr', { hasText: testEmail });
    await updatedRow.locator('button').nth(1).click();

    await expect(page.getByRole('heading', { name: 'Hapus Pengguna' })).toBeVisible();
    await page.click('button:has-text("Hapus")');

    // Verify User Removed from Table
    await expect(page.locator('table')).not.toContainText(testEmail);
  });
});

