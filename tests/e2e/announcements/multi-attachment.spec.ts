import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';

test.describe('Announcement multi-image and multi-file attachments', () => {
  test('creates announcement with multi-image and multi-file, displays them in public feed and opens detail modal on click', async ({
    page,
    request,
  }) => {
    // 1. Login admin via API
    const loginRes = await request.post(`${API}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Create announcement with media_urls and file_urls
    const ts = Date.now();
    const title = `Pengumuman Multi Lampiran ${ts}`;
    const file1 = 'http://localhost:9000/sitransparan-files/sitransparan-rt/documents/tata-tertib.pdf';
    const file2 = 'http://localhost:9000/sitransparan-files/sitransparan-rt/documents/anggaran.pdf';
    const img1 = 'http://localhost:9000/sitransparan-files/sitransparan-rt/proofs/foto-kegiatan-1.png';
    const img2 = 'http://localhost:9000/sitransparan-files/sitransparan-rt/proofs/foto-kegiatan-2.png';

    const res = await request.post(`${API}/api/v1/announcements`, {
      headers,
      data: {
        title,
        content: 'Isi lengkap rincian pengumuman warga dengan multi foto dan berkas PDF.',
        target: 'all',
        media_urls: [img1, img2],
        file_urls: [file1, file2],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.file_urls).toBeDefined();
    expect(body.file_urls.length).toBe(2);
    expect(body.media_urls.length).toBe(2);

    // 3. Buka portal publik /kabar
    await page.goto('/kabar');
    const card = page.locator('article').filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 15000 });

    // Verifikasi badges file lampiran di kartu
    const downloadDoc1 = card.getByText('Unduh Dokumen #1');
    const downloadDoc2 = card.getByText('Unduh Dokumen #2');
    await expect(downloadDoc1).toBeVisible();
    await expect(downloadDoc2).toBeVisible();

    // 4. Klik kartu pengumuman untuk membuka modal detail
    await card.locator('h3').click();

    // 5. Verifikasi modal detail muncul dengan konten lengkap
    const modal = page.locator('[role="dialog"]').or(page.locator('.fixed')).filter({ hasText: title });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.getByText('Berkas Lampiran (2)')).toBeVisible();
    await expect(modal.getByText('tata-tertib.pdf')).toBeVisible();
    await expect(modal.getByText('anggaran.pdf')).toBeVisible();

    // Tutup modal
    await modal.getByRole('button', { name: 'Tutup' }).click();
    await expect(modal).toBeHidden();
  });

  test('rejects announcement with more than 10 file_urls (edge case boundary)', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { token } = await loginRes.json();
    const headers = { Authorization: `Bearer ${token}` };

    const tooManyFiles = Array.from({ length: 11 }, (_, i) => `https://example.com/file-${i}.pdf`);
    const res = await request.post(`${API}/api/v1/announcements`, {
      headers,
      data: {
        title: 'Pengumuman File Berlebih',
        content: 'Konten pengumuman uji batas berkas.',
        file_urls: tooManyFiles,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('file_urls exceeds 10 items');
  });
});
