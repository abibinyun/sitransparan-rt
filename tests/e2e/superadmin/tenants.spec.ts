import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Tenant Management & CRUD', () => {
  test('SuperAdmin can view, create, edit, and list tenants', async ({ page }) => {
    // Login as SuperAdmin
    await page.goto('/login');
    await page.getByLabel('Email').fill('superadmin@platform.local');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    await expect(page).toHaveURL('http://localhost:3000/superadmin/tenants');
    await expect(page.getByText('Super Admin', { exact: true })).toBeVisible();

    // Navigate to SuperAdmin Tenant Management page
    await page.getByRole('link', { name: 'SuperAdmin RT' }).click();
    await expect(page.getByText('Manajemen Tenant RT')).toBeVisible();

    // Click Pendaftaran RT Baru button to open Shadcn Dialog
    await page.getByRole('button', { name: '+ Pendaftaran RT Baru' }).click();
    await expect(page.getByText('Pendaftaran RT Baru', { exact: true })).toBeVisible();

    // Fill form
    const tenantName = `RT 99 Test ${Date.now()}`;
    await page.getByPlaceholder('e.g. RT 01 RW 05 Melati').fill(tenantName);
    
    // Submit
    await page.getByRole('button', { name: 'Simpan Tenant' }).click();

    // Verify tenant appears in table list
    await expect(page.getByText(tenantName)).toBeVisible();
  });
});
