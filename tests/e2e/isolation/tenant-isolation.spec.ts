import { test, expect, Page } from '@playwright/test';
import { login, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, nik16 } from '../helpers';

const RT003 = 'http://rt-003.openrt.local';
const RT004 = 'http://rt-004.openrt.local';

async function createUserForTenant(
  page: Page,
  name: string,
  email: string,
  password: string,
  role: 'admin_rt' | 'resident',
  slugPart: string
) {
  await page.goto('/users');
  await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
  await page.fill('#name', name);
  await page.fill('#email', email);
  const opt = page.locator('#tenant_id option').filter({ hasText: slugPart }).first();
  await opt.waitFor({ state: 'attached' });
  const val = await opt.getAttribute('value');
  await page.selectOption('#tenant_id', val!);
  await page.selectOption('#role', role);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.locator('table')).toContainText(email);
}

async function createResidentAt(page: Page, name: string, nik: string) {
  await page.getByRole('button', { name: 'Tambah Warga' }).click();
  await page.fill('#nik', nik);
  await page.fill('#kk_number', nik);
  await page.fill('#full_name', name);
  await page.check('#is_head_of_family');
  await page.getByRole('button', { name: 'Simpan Data' }).click();
  await expect(page.locator('table')).toContainText(name);
}

test.describe('Tenant isolation through real tenant hostnames', () => {
  test('rt-003 and rt-004 data stay isolated (UI + direct URL + API)', async ({ page, request }) => {
    const ts = Date.now();
    const pw = 'Passw0rd!234';
    const aEmail = `a_admin_${ts}@test.local`;
    const bEmail = `b_admin_${ts}@test.local`;
    const aResident = `ALPHA-RESIDENT ${ts}`;
    const bResident = `BRAVO-RESIDENT ${ts}`;
    const aAnnouncement = `ANNOUNCE-A ${ts}`;

    // Superadmin provisions admin_rt users for tenants rt-003 and rt-004
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await createUserForTenant(page, `Admin A ${ts}`, aEmail, pw, 'admin_rt', 'rt-003');
    await createUserForTenant(page, `Admin B ${ts}`, bEmail, pw, 'admin_rt', 'rt-004');

    // --- Tenant A works on the rt-003 hostname ---
    await login(page, aEmail, pw, RT003);
    await page.goto(`${RT003}/residents`);
    await createResidentAt(page, aResident, nik16(ts));

    // A publishes an announcement
    await page.goto(`${RT003}/announcements`);
    await page.getByRole('button', { name: '+ Tambah Pengumuman' }).click();
    await page.fill('#title', aAnnouncement);
    await page.fill('#content', 'konten rahasia tenant A');
    await page.getByRole('button', { name: 'Buat Pengumuman' }).click();
    await expect(page.getByText(aAnnouncement)).toBeVisible();

    // --- Tenant B works on the rt-004 hostname ---
    const pageB = await page.context().newPage();
    await login(pageB, bEmail, pw, RT004);

    // B's resident list must NOT contain A's resident (B may have an empty
    // table, so assert on the text itself)
    await pageB.goto(`${RT004}/residents`);
    await expect(pageB.getByText(aResident)).not.toBeVisible();
    await createResidentAt(pageB, bResident, nik16(ts + 1));

    // B's public portal must NOT show A's announcement
    await pageB.goto(`${RT004}/public/announcements`);
    await expect(pageB.getByText(aAnnouncement)).not.toBeVisible();

    // --- Back to A: A must NOT see B's resident ---
    await page.goto(`${RT003}/residents`);
    await expect(page.getByText(bResident)).not.toBeVisible();
    await expect(page.locator('table').first()).toContainText(aResident);

    // --- API level: A token is denied on the B hostname, allowed on A hostname ---
    const loginRes = await request.post('http://127.0.0.1:8081/api/v1/auth/login', {
      data: { email: aEmail, password: pw },
    });
    expect(loginRes.ok()).toBeTruthy();
    const token = (await loginRes.json()).token;

    const denied = await request.get('http://127.0.0.1:8081/api/v1/residents', {
      headers: { Host: 'rt-004.openrt.local', Authorization: `Bearer ${token}` },
    });
    expect(denied.status()).toBe(403);

    const allowed = await request.get('http://127.0.0.1:8081/api/v1/residents', {
      headers: { Host: 'rt-003.openrt.local', Authorization: `Bearer ${token}` },
    });
    expect(allowed.status()).toBe(200);

    await pageB.close();
  });
});
