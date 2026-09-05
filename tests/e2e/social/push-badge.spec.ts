import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';

test.describe('Fase 4 — Web Push & Badge Partisipasi', () => {
  test('push config is public and enabled in dev', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/push/config`);
    expect(res.status()).toBe(200);
    const cfg = await res.json();
    expect(cfg.enabled).toBe(true);
    expect(cfg.public_key.length).toBeGreaterThan(40);
  });

  test('subscribe accepts subscription; badge requires login and reflects participation', async ({ page, request }) => {
    // Public web push subscription is supported since migration 000025
    const anon = await request.post(`${API}/api/v1/push/subscribe`, {
      data: { endpoint: 'https://fcm.googleapis.com/test-x', keys_p256dh: 'k', keys_auth: 'a' },
    });
    expect(anon.status()).toBe(201);

    // Anonymous badge denied
    expect((await request.get(`${API}/api/v1/social/badge`)).status()).toBe(401);

    // Admin logs in via UI, reacts to an announcement, votes in a poll, then badge counts them
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const token = (
      await (
        await request.post(`${API}/api/v1/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
      ).json()
    ).token;
    const headers = { Authorization: `Bearer ${token}` };

    // Seed announcement + poll, then react & vote via API
    const ann = await request.post(`${API}/api/v1/announcements`, {
      headers,
      data: { title: `Badge Feed ${Date.now()}`, content: 'x', target: 'all' },
    });
    const announcementId = (await ann.json()).id;
    await request.post(`${API}/api/v1/reactions`, {
      headers,
      data: { target_type: 'announcement', target_id: announcementId, reaction: 'applause' },
    });
    const poll = await request.post(`${API}/api/v1/polls`, {
      headers,
      data: { question: `Poll badge ${Date.now()}`, options: ['A', 'B'] },
    });
    const pollId = (await poll.json()).id;
    await request.post(`${API}/api/v1/polls/${pollId}/vote`, { headers, data: { option_index: 0 } });

    const badgeRes = await request.get(`${API}/api/v1/social/badge`, { headers });
    expect(badgeRes.status()).toBe(200);
    const badge = await badgeRes.json();
    expect(badge.reactions_given).toBeGreaterThanOrEqual(1);
    expect(badge.votes_cast).toBeGreaterThanOrEqual(1);
    expect(['Warga Aktif', 'Warga Teladan', 'Utusan Warga']).toContain(badge.level);

    // Subscribe with valid payload (endpoint unique)
    const endpoint = `https://fcm.googleapis.com/test-${Date.now()}`;
    const sub = await request.post(`${API}/api/v1/push/subscribe`, {
      headers,
      data: {
        endpoint,
        keys_p256dh: 'BKey123',
        keys_auth: 'Auth123',
      },
    });
    expect(sub.status()).toBe(201);

    // Unsubscribe removes it
    const unsub = await request.post(`${API}/api/v1/push/unsubscribe`, {
      headers,
      data: { endpoint },
    });
    expect(unsub.status()).toBe(200);
  });
});
