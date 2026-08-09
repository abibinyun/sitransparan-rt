import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Tenant Management', () => {
  test('SuperAdmin can view dashboard and tenants page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@gmail.com');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByText('Super Admin', { exact: true })).toBeVisible();
  });
});
