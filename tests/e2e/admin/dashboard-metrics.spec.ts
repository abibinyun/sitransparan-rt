import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

const API = 'http://127.0.0.1:8081';

test.describe('Dashboard — metrik ringkasan & export laporan', () => {
  async function openDashboard(page: import('@playwright/test').Page) {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin');
    // Wait until real metric values render (not skeletons)
    await expect(page.getByText('Total Warga')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/^Rp\s[\d.,]+$/).first()).toBeVisible({ timeout: 15000 });
  }

  function extract(bodyText: string, label: string): number | null {
    // Indonesian format: Rp 1.335.000 (groups of 3 with dots). Bound the match
    // so a following text node ("0 iuran pending") is not swallowed.
    const m = bodyText.match(new RegExp(`${label}\\s*Rp?\\s*([\\d]{1,3}(?:\\.[\\d]{3})*(?:,[\\d]+)?)`));
    return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null;
  }

  test('summary cards show coherent numbers (saldo = pemasukan - pengeluaran)', async ({ page }) => {
    await openDashboard(page);
    const body = (await page.locator('body').textContent()) ?? '';

    const income = extract(body, 'Pemasukan');
    const expense = extract(body, 'Pengeluaran');
    const balance = extract(body, 'Saldo Kas');

    expect(income, 'pemasukan terbaca').not.toBeNull();
    expect(expense, 'pengeluaran terbaca').not.toBeNull();
    expect(balance, 'saldo terbaca').not.toBeNull();

    expect(income!).toBeGreaterThan(0);
    expect(balance!).toBe(income! - expense!);

    const residentsMatch = body.match(/Total Warga\s*(\d+)/);
    expect(residentsMatch, 'total warga terbaca').toBeTruthy();
    expect(Number(residentsMatch![1])).toBeGreaterThanOrEqual(0);
  });

  test('dashboard balance matches the backend financial summary API', async ({ page, request }) => {
    await openDashboard(page);
    const body = (await page.locator('body').textContent()) ?? '';
    const uiBalance = extract(body, 'Saldo Kas');
    expect(uiBalance).not.toBeNull();

    const token = (
      await (
        await request.post(`${API}/api/v1/auth/login`, {
          data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        })
      ).json()
    ).token;

    const res = await request.get(`${API}/api/v1/financial/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const summary = await res.json();
    expect(summary.current_balance).toBeDefined();
    // UI shows aggregated saldo; allow small rounding tolerance
    expect(Math.abs(Number(summary.current_balance) - uiBalance!)).toBeLessThan(2);
  });

  test('export CSV downloads a file with metric rows', async ({ page }) => {
    await openDashboard(page);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);

    const fs = require('fs');
    const content = fs.readFileSync((await download.path())!, 'utf8');
    // Backend financial export: header ID,Tanggal,Tipe,Kategori,Jumlah,Deskripsi
    expect(content).toContain('Tanggal');
    expect(content).toMatch(/Tipe|Kategori/);
    expect(content.length).toBeGreaterThan(20);
  });

  test('export PDF triggers backend blob download (not window.print)', async ({ page }) => {
    await openDashboard(page);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: 'Export PDF' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const fs = require('fs');
    const path = await download.path();
    expect(path).toBeTruthy();
    const stat = fs.statSync(path!);
    expect(stat.size).toBeGreaterThan(100);
  });
});
