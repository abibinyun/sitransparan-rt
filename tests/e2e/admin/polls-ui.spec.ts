import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';

test.describe('PollsPage — UI kelola polling (B3)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/polls');
    await expect(page.getByRole('heading', { name: /Kelola Polling/i })).toBeVisible();
  });

  test('admin can create a poll 2 opsi and see it in list, then close it', async ({ page, request }) => {
    const q = `Pertanyaan E2E ${Date.now()}`;
    const token = (await (await request.post(`${API}/api/v1/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })).json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const res = await request.post(`${API}/api/v1/polls`, {
      headers,
      data: { question: q, options: ['Opsi A', 'Opsi B'] },
    });
    expect(res.ok()).toBeTruthy();
    const pollId = (await res.json()).id;

    // Verify via API list
    const listRes = await request.get(`${API}/api/v1/polls`, { headers });
    const polls = (await listRes.json()).data;
    expect(polls.map((p:any)=>p.question)).toContain(q);

    // Vote via API
    const voteRes = await request.post(`${API}/api/v1/polls/${pollId}/vote`, { headers, data: { option_index: 0 } });
    expect(voteRes.ok()).toBeTruthy();
    const voted = await voteRes.json();
    expect(voted.my_vote).toBe(0);

    // Close via API
    const closeRes = await request.delete(`${API}/api/v1/polls/${pollId}`, { headers });
    expect(closeRes.ok()).toBeTruthy();

    // Verify UI page loads
    await page.reload();
    await expect(page.getByRole('heading', { name: /Kelola Polling/i })).toBeVisible({ timeout: 10000 });

    const getRes = await request.get(`${API}/api/v1/polls/${pollId}`, { headers });
    expect(getRes.ok()).toBeTruthy();
    const got = await getRes.json();
    expect(got.status).toBe('closed');
  });

  test('create poll UI validates 2 opsi minimal', async ({ page }) => {
    await page.getByRole('button', { name: /Buat Polling/i }).click();
    await expect(page.getByRole('heading', { name: /Buat Polling Baru/i })).toBeVisible();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Pertanyaan').fill('Q minimal?');
    await dialog.getByPlaceholder('Opsi 1').fill('Satu');
    await dialog.getByPlaceholder('Opsi 2').fill('');
    await dialog.getByRole('button', { name: 'Buat Polling', exact: true }).click();
    await expect(page.getByText(/Minimal 2 opsi/)).toBeVisible();
  });
});
