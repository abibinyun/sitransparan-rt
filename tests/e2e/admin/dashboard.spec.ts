import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Admin Dashboard Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Admin RT can view resident page', async ({ page }) => {
    await page.goto('/admin/residents');
    await expect(page).toHaveURL('/admin/residents');
  });

  test('Admin RT can view financial ledger page', async ({ page }) => {
    await page.goto('/admin/financial');
    await expect(page).toHaveURL('/admin/financial');
  });
});
