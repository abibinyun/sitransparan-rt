# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roles/superadmin.spec.ts >> Role E2E: Super Admin (Platform Admin) >> UC-SUP-02: SuperAdmin Can Access Users & Create User With Selected Tenant
- Location: tests/e2e/roles/superadmin.spec.ts:35:7

# Error details

```
Error: page.goto: Target page, context or browser has been closed
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Role E2E: Super Admin (Platform Admin)', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login as SuperAdmin
> 6  |     await page.goto('/login');
     |                ^ Error: page.goto: Target page, context or browser has been closed
  7  |     await page.getByLabel('Email').fill('superadmin@platform.local');
  8  |     await page.getByLabel('Kata Sandi').fill('admin123');
  9  |     await page.getByRole('button', { name: 'Masuk Akun' }).click();
  10 | 
  11 |     await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  12 |   });
  13 | 
  14 |   test('UC-SUP-01: SuperAdmin Tenant Management CRUD', async ({ page }) => {
  15 |     await page.goto('/superadmin/tenants');
  16 |     await expect(page).toHaveURL('/superadmin/tenants');
  17 |     await expect(page.getByText('Manajemen Tenant RT')).toBeVisible();
  18 | 
  19 |     // Click Add Tenant Button
  20 |     await page.getByRole('button', { name: '+ Pendaftaran RT Baru' }).click();
  21 |     await expect(page.getByText('Pendaftaran RT Baru', { exact: true })).toBeVisible();
  22 | 
  23 |     const timestamp = Date.now();
  24 |     const tenantName = `RT 77 Super ${timestamp}`;
  25 |     const expectedSlug = `rt-77-super-${timestamp}`;
  26 |     const expectedDomain = `${expectedSlug}.openrt.local`;
  27 | 
  28 |     await page.getByPlaceholder('e.g. RT 01 RW 05 Melati').fill(tenantName);
  29 |     await page.getByRole('button', { name: 'Simpan Tenant' }).click();
  30 | 
  31 |     await expect(page.getByText(tenantName)).toBeVisible();
  32 |     await expect(page.getByText(expectedDomain)).toBeVisible();
  33 |   });
  34 | 
  35 |   test('UC-SUP-02: SuperAdmin Can Access Users & Create User With Selected Tenant', async ({ page }) => {
  36 |     await page.goto('/users');
  37 |     await expect(page).toHaveURL('/users');
  38 |     await expect(page.getByRole('heading', { name: 'Manajemen Pengguna' })).toBeVisible();
  39 |     await expect(page.locator('th', { hasText: 'Tenant / RT' })).toBeVisible();
  40 | 
  41 |     const timestamp = Date.now();
  42 |     const testName = `Super User ${timestamp}`;
  43 |     const testEmail = `superuser_${timestamp}@test.local`;
  44 | 
  45 |     await page.click('button:has-text("Tambah Pengguna")');
  46 |     await page.fill('#name', testName);
  47 |     await page.fill('#email', testEmail);
  48 |     await page.fill('#phone', '089988776655');
  49 |     await page.selectOption('#role', 'admin_rt');
  50 |     await page.selectOption('#tenant_id', { index: 1 });
  51 |     await page.fill('#password', 'Password123!');
  52 |     await page.click('button[type="submit"]:has-text("Simpan")');
  53 | 
  54 |     await expect(page.locator('table')).toContainText(testName);
  55 |   });
  56 | });
  57 | 
```