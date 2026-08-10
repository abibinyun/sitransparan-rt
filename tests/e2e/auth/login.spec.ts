import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials
    await page.getByLabel('Email').fill('admin@gmail.com');
    await page.getByLabel('Kata Sandi').fill('admin123');
    
    // Submit login form via submit button "Masuk Akun"
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    // Verify successful login navigation to superadmin tenants page
    await expect(page).toHaveURL('http://localhost:3000/superadmin/tenants');
  });

  test('User receives error on invalid password', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('Email').fill('admin@gmail.com');
    await page.getByLabel('Kata Sandi').fill('wrongpassword');
    
    await page.getByRole('button', { name: 'Masuk Akun' }).click();
    
    // Check backend API error text
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
