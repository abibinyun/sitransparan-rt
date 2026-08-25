import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';

test.describe('Fase 2/3 gap fixes — galeri foto, batas upload, KPI', () => {
  test('announcement with media_urls renders photo carousel in public feed', async ({ page, request }) => {
    const token = (
      await (
        await request.post(`${API}/api/v1/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
      ).json()
    ).token;
    const headers = { Authorization: `Bearer ${token}` };
    const ts = Date.now();
    const title = `Laporan Visual ${ts}`;

    const res = await request.post(`${API}/api/v1/announcements`, {
      headers,
      data: {
        title,
        content: 'Dokumentasi kerja bakti dengan foto hasil.',
        target: 'all',
        media_urls: [
          'http://localhost:9000/sitransparan-files/sitransparan-rt/proofs/1787484813409527205_e766ead4.txt',
        ],
      },
    });
    expect(res.status()).toBe(201);

    await page.goto('/public/announcements');
    const card = page.locator('article').filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15000 });
    // Carousel renders the image
    await expect(card.locator('img').first()).toBeAttached();
  });

  test('upload larger than 5 MB or disallowed type is rejected', async ({ request }) => {
    const token = (
      await (
        await request.post(`${API}/api/v1/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
      ).json()
    ).token;
    const headers = { Authorization: `Bearer ${token}` };

    // Disallowed type (text/plain)
    const bad = await request.post(`${API}/api/v1/financial/upload`, {
      headers,
      multipart: {
        file: { name: 'bukti.txt', mimeType: 'text/plain', buffer: Buffer.from('bukan gambar') },
      },
    });
    expect(bad.status()).toBe(400);
    expect(await bad.text()).toContain('tipe file');

    // Oversized image (>5 MB)
    const big = await request.post(`${API}/api/v1/financial/upload`, {
      headers,
      multipart: {
        file: {
          name: 'bukti.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(6 * 1024 * 1024, 1),
        },
      },
    });
    expect(big.status()).toBe(400);
    expect(await big.text()).toContain('5 MB');
  });

  test('portal events (KPI) are recorded', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/t/sitransparan-rt/events`, {
      data: { event_type: 'share_opened' },
    });
    expect(res.status()).toBe(204);

    // Invalid event type rejected
    const bad = await request.post(`${API}/api/v1/t/sitransparan-rt/events`, {
      data: { event_type: 'hack_view' },
    });
    expect(bad.status()).toBe(400);
  });
});
