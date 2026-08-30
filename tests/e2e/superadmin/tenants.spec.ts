import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Tenant Management & CRUD', () => {
  test('SuperAdmin can view, create, edit, and list tenants', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));
    page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));

    // Login as SuperAdmin
    await page.goto('/login');
    await page.getByLabel('Email').fill('abi@gmail.com');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    await expect(page).toHaveURL(/\/admin\/tenants$/);
    await expect(page.getByRole('heading', { name: 'Manajemen Tenant RT' })).toBeVisible();

    // Click Pendaftaran RT Baru button to open Shadcn Dialog
    await page.getByRole('button', { name: '+ Pendaftaran RT Baru' }).click();
    await expect(page.getByText('Pendaftaran RT Baru', { exact: true })).toBeVisible();

    // Fill form
    const timestamp = Date.now();
    const tenantName = `RT 99 Test ${timestamp}`;
    const expectedSlug = `rt-99-test-${timestamp}`;
    const expectedDomain = `${expectedSlug}.openrt.local`;

    await page.getByTestId('tenant-name-input').fill(tenantName);
    await page.getByTestId('tenant-slug-input').fill(expectedSlug);
    
    // Submit and wait for response
    await page.getByTestId('save-tenant-btn').click();

    // Verify tenant appears in table list (scoped to table, not dropdown)
    await expect(page.getByRole('cell', { name: tenantName })).toBeVisible();
    await expect(page.getByRole('cell', { name: new RegExp(`^${expectedSlug}\\.`) })).toBeVisible();
  });
});
