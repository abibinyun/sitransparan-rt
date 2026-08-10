import { test, expect, Page } from '@playwright/test';
import {
  login,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from '../helpers';

test.describe('Negative authorization — denied roles', () => {
  test('resident cannot access admin pages or admin APIs (direct URL + API)', async ({ page, request }) => {
    const ts = Date.now();
    const email = `warga_neg_${ts}@test.local`;
    const pw = 'Password123!';

    // Superadmin provisions a resident user in tenant sitransparan-rt
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await page.goto('/users');
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    await page.fill('#name', `Warga Neg ${ts}`);
    await page.fill('#email', email);
    const opt = page.locator('#tenant_id option').filter({ hasText: 'sitransparan' }).first();
    await opt.waitFor({ state: 'attached' });
    const val = await opt.getAttribute('value');
    await page.selectOption('#tenant_id', val!);
    await page.selectOption('#role', 'resident');
    await page.fill('#password', pw);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('table')).toContainText(email);

    // Resident logs in
    await page.getByRole('button', { name: 'Logout' }).click();
    await login(page, email, pw);

    // Admin-only navigation links are hidden
    await expect(page.getByRole('link', { name: 'Manajemen Pengguna' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Data Warga' })).not.toBeVisible();

    // Direct URL access to the admin-only /users route is redirected away
    await page.goto('/users');
    await expect(page).toHaveURL('http://localhost:3000/');

    // /residents is open to any authenticated role in the SPA, but the backend
    // denies the data — the UI must surface the failure, not fake success
    await page.goto('/residents');
    await expect(page.getByText(/403|Request failed|Gagal memuat data warga/)).toBeVisible();

    // API-level denial — the frontend guard is NOT the security boundary
    const loginRes = await request.post('http://127.0.0.1:8081/api/v1/auth/login', {
      data: { email, password: pw },
    });
    const token = (await loginRes.json()).token;

    const rResidents = await request.get('http://127.0.0.1:8081/api/v1/residents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(rResidents.status()).toBe(403);

    const rUsers = await request.get('http://127.0.0.1:8081/api/v1/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(rUsers.status()).toBe(403);

    const rAnnounce = await request.post('http://127.0.0.1:8081/api/v1/announcements', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'X', content: 'Y', target: 'all' },
    });
    expect(rAnnounce.status()).toBe(403);
  });

  test('admin RT cannot access superadmin tenant management', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByRole('link', { name: 'SuperAdmin RT' })).not.toBeVisible();
    await page.goto('/superadmin/tenants');
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});
