import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Events — full business workflow (CRUD + RAB + RSVP)', () => {
  const ts = Date.now();
  const eventTitle = `Kerja Bakti E2E ${ts}`;

  test('admin creates an event, records a RAB budget item, and RSVPs a resident', async ({ page, request }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Daftar Kegiatan RT/RW' })).toBeVisible();

    // CREATE event — capture the response to get the event id
    await page.getByRole('button', { name: '+ Tambah Kegiatan' }).click();
    await page.locator('#eventTitle').fill(eventTitle);
    await page.locator('#eventDescription').fill('Kerja bakti bulanan dan pengecekan saluran.');
    await page.locator('#eventDate').fill('2026-09-15T08:00');
    await page.locator('#eventLocation').fill('Balai Warga RT 05');
    const [createResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v1/events') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Tambah', exact: true }).click(),
    ]);
    expect(createResp.status()).toBe(201);
    const createdEvent = await createResp.json();

    // Card appears in the list
    const card = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: eventTitle }) })
      .filter({ has: page.getByRole('button', { name: 'RAB & Budget' }) })
      .last();
    await expect(card).toBeVisible({ timeout: 15000 });

    // RAB & Budget: add a budget item and verify totals update
    await card.getByRole('button', { name: 'RAB & Budget' }).click();
    const rabDialog = page.getByRole('dialog');
    await expect(rabDialog).toBeVisible();
    await rabDialog.getByPlaceholder('Contoh: Konsumsi & Perlengkapan').fill('Konsumsi warga');
    await rabDialog.getByLabel(/Estimasi Biaya/).fill('500000');
    await rabDialog.getByLabel(/Realisasi Biaya/).fill('450000');
    await rabDialog.getByRole('button', { name: 'Simpan Anggaran' }).click();
    // The modal auto-closes on success
    await expect(rabDialog).not.toBeVisible({ timeout: 10000 });

    // Verify the budget persisted via the API (the list card does not
    // carry budget data, so re-opening the modal shows empty prefill)
    const adminToken = (
      await (
        await request.post('http://127.0.0.1:8081/api/v1/auth/login', {
          data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        })
      ).json()
    ).token;
    const budgetRes = await request.get(
      `http://127.0.0.1:8081/api/v1/events/${createdEvent.id}/budget`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(budgetRes.status()).toBe(200);
    const budgetJson = await budgetRes.json();
    const budgetItems: Array<Record<string, unknown>> = budgetJson.data ?? budgetJson ?? [];
    const saved = budgetItems.find((b) => b.description === 'Konsumsi warga');
    expect(saved, 'budget item tersimpan').toBeTruthy();
    expect(Number(saved!.estimated_cost)).toBe(500000);
    expect(Number(saved!.actual_cost)).toBe(450000);
    // RSVP: pick a resident and record attendance
    await card.getByRole('button', { name: 'RSVP Kehadiran' }).click();
    const rsvpDialog = page.getByRole('dialog');
    await expect(rsvpDialog).toBeVisible();
    const saveBtn = rsvpDialog.getByRole('button', { name: 'Simpan Status' });
    await expect(saveBtn).toBeDisabled(); // resident not chosen yet
    await rsvpDialog.getByLabel('Pilih Warga').selectOption({ index: 1 });
    await expect(saveBtn).toBeEnabled();
    await rsvpDialog.getByLabel('Status Kehadiran').selectOption({ index: 0 }); // Hadir
    // The modal closes silently on success — assert on the backend response
    const [rsvpResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/rsvp') && r.request().method() === 'POST'),
      saveBtn.click(),
    ]);
    expect(rsvpResp.status(), 'RSVP diterima backend').toBeLessThan(300);
    await expect(rsvpDialog).not.toBeVisible({ timeout: 10000 });

    // Cleanup — delete the event to keep residue low
    page.on('dialog', (dialog) => dialog.accept());
    await card.getByRole('button', { name: 'Hapus' }).click();
    await expect(card).not.toBeVisible({ timeout: 15000 });
  });

  test('status filter narrows visible event cards', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Daftar Kegiatan RT/RW' })).toBeVisible();

    // Create an ongoing event so filter has deterministic cards
    const ts = Date.now();
    await page.getByRole('button', { name: '+ Tambah Kegiatan' }).click();
    await page.fill('#eventTitle', `Event Ongoing ${ts}`);
    await page.fill('#eventDescription', 'Deskripsi ongoing');
    await page.fill('#eventDate', '2026-09-01T08:00');
    await page.fill('#eventLocation', 'Lapangan RT');
    await page.selectOption('#eventStatus', 'ongoing');
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Kegiatan Baru' })).not.toBeVisible();

    // With "all" there is at least one card
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 10000 });

    // Filter to Cancelled — every remaining card must carry the Dibatalkan badge
    const filter = page.locator('#statusFilter');
    await filter.selectOption('cancelled');
    await page.waitForTimeout(1500); // allow refetch

    const badges = page.getByText(/^(Rencana|Berlangsung|Selesai|Dibatalkan)$/, { exact: true });
    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toHaveText('Dibatalkan');
    }

    // Filter back to Ongoing — all badges must be Berlangsung
    await filter.selectOption('ongoing');
    await page.waitForTimeout(1500);
    const ongoingBadges = page.getByText(/^(Rencana|Berlangsung|Selesai|Dibatalkan)$/, { exact: true });
    const ongoingCount = await ongoingBadges.count();
    expect(ongoingCount).toBeGreaterThan(0);
    for (let i = 0; i < ongoingCount; i++) {
      await expect(ongoingBadges.nth(i)).toHaveText('Berlangsung');
    }
  });

  test('admin edits an event title and the change persists after reload', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/events');

    // Create a dedicated event for this test
    await page.getByRole('button', { name: '+ Tambah Kegiatan' }).click();
    await page.locator('#eventTitle').fill(eventTitle);
    await page.locator('#eventDate').fill('2026-09-20T16:00');
    await page.locator('#eventLocation').fill('Pos Kamling');
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
    let card = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: eventTitle }) })
      .filter({ has: page.getByRole('button', { name: 'Edit' }) })
      .last();
    await expect(card).toBeVisible({ timeout: 15000 });

    // EDIT title
    const updatedTitle = `${eventTitle} Revisi`;
    await card.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#eventTitle').fill(updatedTitle);
    await dialog.getByRole('button', { name: /Simpan|Update/i }).click();

    // Persist across reload
    await page.reload();
    await expect(page.getByRole('heading', { level: 3, name: updatedTitle })).toBeVisible({ timeout: 15000 });

    // Cleanup
    page.on('dialog', (d) => d.accept());
    card = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: updatedTitle }) })
      .filter({ has: page.getByRole('button', { name: 'Hapus' }) })
      .last();
    await card.getByRole('button', { name: 'Hapus' }).click();
    await expect(card).not.toBeVisible({ timeout: 15000 });
  });
});
