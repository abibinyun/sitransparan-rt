import { test, expect } from '@playwright/test';
import {
  login,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from '../helpers';

const API = 'http://127.0.0.1:8081';

test.describe('Meetings — authorization & visibility enforcement', () => {
  test('resident cannot write meetings/action-items and cannot read confidential ones', async ({ page, request }) => {
    const ts = Date.now();
    const email = `warga_meet_${ts}@test.local`;
    const pw = 'Password123!';

    // Superadmin provisions a resident user in the sitransparan-rt tenant
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await page.goto('/users');
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    await page.fill('#name', `Warga Meeting ${ts}`);
    await page.fill('#email', email);
    const opt = page.locator('#tenant_id option').filter({ hasText: 'sitransparan' }).first();
    await opt.waitFor({ state: 'attached' });
    const val = await opt.getAttribute('value');
    await page.selectOption('#tenant_id', val!);
    await page.selectOption('#role', 'resident');
    await page.fill('#password', pw);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('table')).toContainText(email);

    // Resident token
    const loginRes = await request.post(`${API}/api/v1/auth/login`, {
      data: { email, password: pw },
    });
    expect(loginRes.ok()).toBeTruthy();
    const residentToken = (await loginRes.json()).token;
    const residentHeaders = { Authorization: `Bearer ${residentToken}` };

    // Admin creates a CONFIDENTIAL meeting
    const adminLogin = await request.post(`${API}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const adminToken = (await adminLogin.json()).token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const secretTitle = `Rapat Rahasia E2E ${ts}`;
    const createRes = await request.post(`${API}/api/v1/meetings`, {
      headers: adminHeaders,
      data: {
        title: secretTitle,
        agenda: 'Agenda rahasia',
        meeting_date: '2026-09-01',
        visibility: 'confidential',
      },
    });
    expect(createRes.status()).toBe(201);
    const createdMeeting = await createRes.json();

    // Admin adds an action item to the confidential meeting
    const itemRes = await request.post(`${API}/api/v1/action-items`, {
      headers: adminHeaders,
      data: {
        meeting_id: createdMeeting.id,
        task: `Tugas rahasia ${ts}`,
        assignee_name: 'Pak Sekretaris',
      },
    });
    expect(itemRes.status()).toBe(201);

    // --- RESIDENT DENIALS ---
    // 1. Cannot create meetings
    const w1 = await request.post(`${API}/api/v1/meetings`, {
      headers: residentHeaders,
      data: { title: 'X', agenda: 'Y', meeting_date: '2026-09-02' },
    });
    expect(w1.status()).toBe(403);

    // 2. Cannot create action items
    const w2 = await request.post(`${API}/api/v1/action-items`, {
      headers: residentHeaders,
      data: { meeting_id: createdMeeting.id, task: 'X', assignee_name: 'Y' },
    });
    expect(w2.status()).toBe(403);

    // 3. Cannot widen the visibility filter via query string
    const listRes = await request.get(`${API}/api/v1/meetings?visibility=confidential`, {
      headers: residentHeaders,
    });
    expect(listRes.status()).toBe(200);
    const listed = await listRes.json();
    const titles = (listed.data ?? []).map((m: { title: string }) => m.title);
    expect(titles).not.toContain(secretTitle);

    // 4. Direct ID access to the confidential meeting is denied
    const detail = await request.get(`${API}/api/v1/meetings/${createdMeeting.id}`, {
      headers: residentHeaders,
    });
    expect(detail.status()).toBe(403);

    // 5. Action items belonging to the confidential meeting are filtered out
    const itemsList = await request.get(`${API}/api/v1/action-items`, {
      headers: residentHeaders,
    });
    expect(itemsList.status()).toBe(200);
    const items = await itemsList.json();
    const tasks = (items.data ?? []).map((i: { task: string }) => i.task);
    expect(tasks).not.toContain(`Tugas rahasia ${ts}`);

    // --- ADMIN still sees everything ---
    const adminDetail = await request.get(`${API}/api/v1/meetings/${createdMeeting.id}`, {
      headers: adminHeaders,
    });
    expect(adminDetail.status()).toBe(200);
    const adminItems = await (await request.get(`${API}/api/v1/action-items`, { headers: adminHeaders })).json();
    expect((adminItems.data ?? []).map((i: { task: string }) => i.task)).toContain(`Tugas rahasia ${ts}`);
  });

  test('meeting data is tenant-isolated across real tenant hostnames', async ({ request }) => {
    const ts = Date.now();

    // Seeded admin belongs to tenant sitransparan-rt; platform-host requests
    // are scoped purely by the JWT tenant claim.
    const adminLogin = await request.post(`${API}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const token = (await adminLogin.json()).token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Create a meeting in the admin's own tenant (no hostname override)
    const created = await request.post(`${API}/api/v1/meetings`, {
      headers: authHeaders,
      data: {
        title: `Rapat Isolasi A ${ts}`,
        agenda: 'Data tenant A',
        meeting_date: '2026-09-03',
        visibility: 'public',
      },
    });
    expect(created.status()).toBe(201);
    const meeting = await created.json();

    // Reading it back on its own scope works...
    const ownDetail = await request.get(`${API}/api/v1/meetings/${meeting.id}`, { headers: authHeaders });
    expect(ownDetail.status()).toBe(200);

    // ...but ANY foreign tenant hostname must be denied for the same token,
    // even though the meeting exists and is public.
    const deniedDetailRT003 = await request.get(`${API}/api/v1/meetings/${meeting.id}`, {
      headers: { ...authHeaders, Host: 'rt-003.openrt.local' },
    });
    expect(deniedDetailRT003.status()).toBe(403);

    const deniedListRT004 = await request.get(`${API}/api/v1/meetings`, {
      headers: { ...authHeaders, Host: 'rt-004.openrt.local' },
    });
    expect(deniedListRT004.status()).toBe(403);

    const deniedCreateRT004 = await request.post(`${API}/api/v1/meetings`, {
      headers: { ...authHeaders, Host: 'rt-004.openrt.local' },
      data: { title: 'intruder', agenda: 'x', meeting_date: '2026-09-04' },
    });
    expect(deniedCreateRT004.status()).toBe(403);

    // Unknown tenant host is rejected outright
    const unknownHost = await request.get(`${API}/api/v1/meetings`, {
      headers: { ...authHeaders, Host: 'rt-999.openrt.local' },
    });
    expect([403, 404]).toContain(unknownHost.status());
  });
});
