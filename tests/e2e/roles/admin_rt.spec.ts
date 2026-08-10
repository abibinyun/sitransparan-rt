import { test, expect } from '@playwright/test';

test.describe('Role E2E: Admin RT (Tenant Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin RT (Tenant user)
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@sitransparan.rt');
    await page.getByLabel('Kata Sandi').fill('password123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();

    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('UC-ADM-01: User Management CRUD', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/users');

    const timestamp = Date.now();
    const testName = `Warga RT ${timestamp}`;
    const testEmail = `warga_rt_${timestamp}@test.local`;
    const updatedName = `Warga RT Edit ${timestamp}`;

    // Create User
    await page.click('button:has-text("Tambah Pengguna")');
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#phone', '081234567890');
    await page.selectOption('#role', 'resident');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Simpan")');

    await expect(page.locator('table')).toContainText(testName);

    // Edit User
    const userRow = page.locator('tr', { hasText: testEmail });
    await userRow.locator('button').first().click();
    await page.fill('#name', updatedName);
    await page.click('button[type="submit"]:has-text("Simpan")');

    await expect(page.locator('table')).toContainText(updatedName);

    // Delete User
    const updatedRow = page.locator('tr', { hasText: testEmail });
    await updatedRow.locator('button').nth(1).click();
    await page.click('button:has-text("Hapus")');

    await expect(page.locator('table')).not.toContainText(testEmail);
  });

  test('UC-ADM-02: Resident Data Access', async ({ page }) => {
    await page.goto('/residents');
    await expect(page).toHaveURL('/residents');
  });

  test('UC-ADM-03: Financial Ledger Access', async ({ page }) => {
    await page.goto('/financial');
    await expect(page).toHaveURL('/financial');
  });

  test('UC-ADM-04: Events & Budgeting Access', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL('/events');
  });

  test('UC-ADM-05: Announcements & Documents Access', async ({ page }) => {
    await page.goto('/announcements');
    await expect(page).toHaveURL('/announcements');
  });
});
