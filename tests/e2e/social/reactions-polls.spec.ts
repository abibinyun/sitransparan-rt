import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';

async function getToken(request: any, email: string, password: string) {
  const res = await request.post(`${API}/api/v1/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token;
}

test.describe('Fase 3 — Reaksi & Polling (identitas wajib, 1 orang 1 aksi)', () => {
  let announcementId: string;

  test.beforeAll(async ({ request }) => {
    // Seed satu pengumuman publik via admin
    const token = await getToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request.post(`${API}/api/v1/announcements`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `Pengumuman Reaksi E2E ${Date.now()}`,
        content: 'Uji reaksi dan polling.',
        target: 'all',
      },
    });
    expect(res.status()).toBe(201);
    announcementId = (await res.json()).id;
  });

  test('anonymous cannot react; login required', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/reactions`, {
      data: { target_type: 'announcement', target_id: announcementId, reaction: 'support' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('resident can react once, change it, and see aggregate counts', async ({ page, request }) => {
    // Provision resident via superadmin UI
    const ts = Date.now();
    const email = `warga_reaksi_${ts}@test.local`;
    const pw = 'Password123!';
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await page.goto('/users');
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    await page.fill('#name', `Warga Reaksi ${ts}`);
    await page.fill('#email', email);
    const opt = page.locator('#tenant_id option').filter({ hasText: 'sitransparan' }).first();
    await opt.waitFor({ state: 'attached' });
    await page.selectOption('#tenant_id', await opt.getAttribute('value'));
    await page.selectOption('#role', 'resident');
    await page.fill('#password', pw);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('table')).toContainText(email);
    await page.getByRole('button', { name: 'Logout' }).click();

    const token = await getToken(request, email, pw);
    const headers = { Authorization: `Bearer ${token}` };

    // React
    const r1 = await request.post(`${API}/api/v1/reactions`, {
      headers,
      data: { target_type: 'announcement', target_id: announcementId, reaction: 'support' },
    });
    expect(r1.status()).toBe(200);
    let summary = await r1.json();
    expect(summary.counts.support).toBe(1);
    expect(summary.mine).toBe('support');

    // Change reaction (upsert, still 1 total)
    const r2 = await request.post(`${API}/api/v1/reactions`, {
      headers,
      data: { target_type: 'announcement', target_id: announcementId, reaction: 'like' },
    });
    summary = await r2.json();
    expect(summary.total).toBe(1);
    expect(summary.mine).toBe('like');

    // Remove
    const r3 = await request.delete(`${API}/api/v1/reactions?target_type=announcement&target_id=${announcementId}`, { headers });
    summary = await r3.json();
    expect(summary.total).toBe(0);

    // Invalid reaction type rejected
    const r4 = await request.post(`${API}/api/v1/reactions`, {
      headers,
      data: { target_type: 'announcement', target_id: announcementId, reaction: 'fire' },
    });
    expect(r4.status()).toBe(400);
  });

  test('polling: admin creates, resident votes once, results are aggregate-only', async ({ page, request }) => {
    const ts = Date.now();
    const email = `warga_poll_${ts}@test.local`;
    const pw = 'Password123!';

    // Admin creates poll via API
    const adminToken = await getToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request.post(`${API}/api/v1/polls`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { question: `Jadwal kerja bakti ${ts}?`, options: ['Minggu pagi', 'Minggu sore'] },
    });
    expect(created.status()).toBe(201);
    const pollId = (await created.json()).id;

    // Resident cannot create polls
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await page.goto('/users');
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    await page.fill('#name', `Warga Poll ${ts}`);
    await page.fill('#email', email);
    const opt = page.locator('#tenant_id option').filter({ hasText: 'sitransparan' }).first();
    await opt.waitFor({ state: 'attached' });
    await page.selectOption('#tenant_id', await opt.getAttribute('value'));
    await page.selectOption('#role', 'resident');
    await page.fill('#password', pw);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('table')).toContainText(email);
    await page.getByRole('button', { name: 'Logout' }).click();

    const resToken = await getToken(request, email, pw);
    const resHeaders = { Authorization: `Bearer ${resToken}` };

    const denied = await request.post(`${API}/api/v1/polls`, {
      headers: resHeaders,
      data: { question: 'x', options: ['a', 'b'] },
    });
    expect(denied.status()).toBe(403);

    // Vote + change vote
    const v1 = await request.post(`${API}/api/v1/polls/${pollId}/vote`, {
      headers: resHeaders,
      data: { option_index: 0 },
    });
    expect(v1.status()).toBe(200);
    let poll = await v1.json();
    expect(poll.votes[0]).toBe(1);
    expect(poll.my_vote).toBe(0);

    await request.post(`${API}/api/v1/polls/${pollId}/vote`, { headers: resHeaders, data: { option_index: 1 } });
    poll = await (await request.get(`${API}/api/v1/polls/${pollId}`, { headers: resHeaders })).json();
    expect(poll.total_votes).toBe(1, 'ubah suara tidak boleh menambah total');
    expect(poll.my_vote).toBe(1);

    // Out-of-range rejected
    const bad = await request.post(`${API}/api/v1/polls/${pollId}/vote`, {
      headers: resHeaders,
      data: { option_index: 9 },
    });
    expect(bad.status()).toBe(400);

    // Public aggregate endpoint: no my_vote, no voter identity
    const pub = await request.get(`${API}/api/v1/t/sitransparan-rt/polls/${pollId}`);
    expect(pub.status()).toBe(200);
    const pubBody = await pub.json();
    expect(pubBody.total_votes).toBe(1);
    expect(pubBody.my_vote).toBeUndefined();
    expect(JSON.stringify(pubBody)).not.toContain('user_id');
  });
});
