import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials
    await page.getByLabel('Email').fill('abi@gmail.com');
    await page.getByLabel('Kata Sandi').fill('admin123');
    
    // Submit login form via submit button "Masuk Akun"
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    // Verify successful login navigation to the superadmin tenants page
    // (canonical path per docs/domains-and-routing.md)
    await expect(page).toHaveURL(/\/admin\/tenants$/);
  });

  test('User receives error on invalid password', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('Email').fill('admin@gmail.com');
    await page.getByLabel('Kata Sandi').fill('wrongpassword');
    
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    // Check backend API error text
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('User can logout cleanly on tenant subdomain and return to login without blank screen', async ({ page }) => {
    const RT003 = 'http://rt-003.openrt.local';
    // Navigate to tenant RT003 login page
    await page.goto(`${RT003}/login`);
    await expect(page.getByRole('heading', { name: 'Masuk ke Sitransparan RT' })).toBeVisible();
    await page.getByLabel('Email').fill('abi@gmail.com');
    await page.getByLabel('Kata Sandi').fill('admin123');
    await page.getByRole('button', { name: 'Masuk Akun' }).click();

    // Superadmin entering from tenant is redirected to platform tenants page
    await expect(page).toHaveURL(/\/admin\/tenants/);

    // Logout and verify we can load login page cleanly
    const logoutBtn = page.getByRole('button', { name: 'Logout' });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Masuk ke Sitransparan RT' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk Akun' })).toBeVisible();
  });
});
