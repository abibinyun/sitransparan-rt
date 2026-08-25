import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';
const SLUG = 'sitransparan-rt';

test.describe('Public transparency API — anonymous access', () => {
  test('GET /t/{slug}/meetings exposes only public meetings, sanitized', async ({ request }) => {
    // Seed: one public + one confidential meeting as admin
    const token = (
      await (
        await request.post(`${API}/api/v1/auth/login`, {
          data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        })
      ).json()
    ).token;
    const headers = { Authorization: `Bearer ${token}` };
    const ts = Date.now();
    const mk = async (title: string, visibility: string) =>
      request.post(`${API}/api/v1/meetings`, {
        headers,
        data: { title, agenda: 'agenda', meeting_date: '2026-10-01', visibility },
      });
    const pubTitle = `Musyawarah Publik ${ts}`;
    const secTitle = `Musyawarah Tertutup ${ts}`;
    expect((await mk(pubTitle, 'public')).status()).toBe(201);
    expect((await mk(secTitle, 'confidential')).status()).toBe(201);

    // Anonymous fetch
    const res = await request.get(`${API}/api/v1/t/${SLUG}/meetings`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const titles = (body.data ?? []).map((m: { title: string }) => m.title);
    expect(titles).toContain(pubTitle);
    expect(titles).not.toContain(secTitle);

    // Sanitized: no internal notes, no creator identity
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('"notes"');
    expect(raw).not.toContain('"created_by"');
  });

  test('GET /t/{slug}/financial-summary exposes aggregates only', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/t/${SLUG}/financial-summary`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.current_balance).toBe('number');
    expect(typeof body.monthly_income).toBe('number');
    expect(typeof body.monthly_expense).toBe('number');
    expect(Array.isArray(body.spending_breakdown)).toBe(true);

    const raw = JSON.stringify(body);
    for (const leaked of ['proof_url', 'resident_id', '"funds"', 'period_month']) {
      expect(raw).not.toContain(leaked);
    }
  });

  test('unknown or inactive slug is 404, hostname mismatch is 404', async ({ request }) => {
    expect((await request.get(`${API}/api/v1/t/rt-tidak-ada/meetings`)).status()).toBe(404);
    expect((await request.get(`${API}/api/v1/t/rt-tidak-ada/financial-summary`)).status()).toBe(404);

    const mismatch = await request.get(`${API}/api/v1/t/${SLUG}/meetings`, {
      headers: { Host: 'rt-004.openrt.local' },
    });
    expect(mismatch.status()).toBe(404);
  });

  test('share card modal renders a non-blank canvas preview', async ({ page }) => {
    await page.goto('/kabar');
    const shareBtn = page.getByRole('button', { name: 'Bagikan ke WhatsApp' }).first();
    await shareBtn.waitFor({ timeout: 15000 });
    await shareBtn.click();

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // The canvas must actually be painted (not transparent)
    const painted = await canvas.evaluate((el) => {
      const ctx = (el as HTMLCanvasElement).getContext('2d')!;
      const d = ctx.getImageData(30, 30, 1, 1).data;
      return d[3] === 255;
    });
    expect(painted, 'canvas preview harus tergambar').toBe(true);

    // Download button present
    await expect(page.getByRole('button', { name: /Unduh PNG/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Buka WhatsApp/ })).toBeVisible();
  });
});
