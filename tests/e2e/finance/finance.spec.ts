import { test, expect, Page } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD, parseRp, nik16 } from '../helpers';

async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function readSaldo(page: Page): Promise<number> {
  const card = page.locator('div.rounded-lg.border').filter({ hasText: 'Saldo Kas RT (Total)' });
  await expect(card).toBeVisible();
  return parseRp(await card.locator('p.mt-2').innerText());
}

async function readIncome(page: Page): Promise<number> {
  const card = page.locator('div.rounded-lg').filter({ hasText: 'Total Masuk (Income)' });
  await expect(card).toBeVisible();
  return parseRp(await card.locator('p.mt-2').innerText());
}

async function createResident(page: Page, name: string, nik: string) {
  await page.goto('/residents');
  await page.getByRole('button', { name: 'Tambah Warga' }).click();
  await page.fill('#nik', nik);
  await page.fill('#kk_number', nik);
  await page.fill('#full_name', name);
  await page.check('#is_head_of_family');
  await page.getByRole('button', { name: 'Simpan Data' }).click();
  await expect(page.locator('table')).toContainText(name);
}

test.describe('Finance — dues, transactions & summary recalculation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('record dues payment, verify it, and confirm the summary saldo increases', async ({ page }) => {
    const ts = Date.now();
    const residentName = `Warga Iuran ${ts}`;
    const nik = nik16(ts);
    await createResident(page, residentName, nik);

    await page.goto('/financial');
    const saldoBefore = await readSaldo(page);

    // Ensure at least one fee category exists (seeded with Iuran Sampah or create Iuran Warga)
    await page.getByRole('button', { name: /^Master Kategori Iuran/ }).click();
    const hasExistingCategory = (await page.locator('table').locator('tr').count()) > 1;
    let selectedCategoryName = 'Iuran Sampah';
    if (!hasExistingCategory) {
      await page.getByRole('button', { name: 'Tambah Jenis Iuran' }).click();
      await page.fill('#catName', 'Iuran Warga');
      await page.fill('#catAmount', '50000');
      await page.selectOption('#catPeriod', 'monthly');
      await page.getByRole('button', { name: 'Simpan Kategori' }).click();
      await expect(page.locator('table')).toContainText('Iuran Warga');
      selectedCategoryName = 'Iuran Warga';
    } else {
      const firstRowText = await page.locator('table tbody tr').first().locator('td').first().textContent();
      if (firstRowText?.trim()) {
        selectedCategoryName = firstRowText.trim();
      }
    }
    await page.getByRole('button', { name: /^Iuran Warga/ }).click();

    // Record the dues payment
    await page.getByRole('button', { name: '+ Bayar / Catat Iuran' }).click();
    await expect(page.getByRole('heading', { name: 'Catat / Bayar Iuran Warga' })).toBeVisible();

    const residentOpt = page.locator('#duesResident option').filter({ hasText: residentName }).first();
    await residentOpt.waitFor({ state: 'attached' });
    const residentValue = await residentOpt.getAttribute('value');
    await page.selectOption('#duesResident', residentValue!);

    const catOpt = page.locator('#duesCategory option').filter({ hasText: selectedCategoryName }).first();
    await catOpt.waitFor({ state: 'attached' });
    const catValue = await catOpt.getAttribute('value');
    await page.selectOption('#duesCategory', catValue!);
    await page.fill('#duesAmount', '50000');
    await page.getByRole('button', { name: 'Simpan Iuran' }).click();

    // Switch to Riwayat Transaksi sub-tab to view individual row & actions
    await page.getByRole('button', { name: /^Riwayat Transaksi/ }).click();

    // Row appears with pending status
    const row = page.locator('tr', { hasText: residentName });
    await expect(row).toContainText('pending');

    // Verify the payment
    await row.getByRole('button', { name: 'Verifikasi' }).click();
    await expect(page.locator('tr', { hasText: residentName })).toContainText('verified');

    // Summary saldo increased by exactly the verified amount
    const saldoAfter = await readSaldo(page);
    expect(saldoAfter).toBe(saldoBefore + 50000);

    // Persistence after reload
    await page.reload();
    await page.getByRole('button', { name: /^Riwayat Transaksi/ }).click();
    await expect(page.locator('tr', { hasText: residentName })).toContainText('verified');
    expect(await readSaldo(page)).toBe(saldoAfter);
  });

  test('cash transactions recalculate income, expense and saldo', async ({ page }) => {
    await page.goto('/financial');
    const saldoBefore = await readSaldo(page);
    const incomeBefore = await readIncome(page);

    // Income transaction
    await page.getByRole('button', { name: '+ Transaksi Kas RT' }).click();
    await expect(page.getByRole('heading', { name: 'Catat Transaksi Kas RT' })).toBeVisible();
    await page.selectOption('#txCategory', 'IURAN_WARGA');
    await page.fill('#txAmount', '100000');
    await page.fill('#txDesc', `TX IN E2E ${Date.now()}`);
    await page.getByRole('button', { name: 'Simpan Transaksi' }).click();
    await page.getByRole('button', { name: /^Transaksi Kas RT/ }).click();
    await expect(page.locator('table')).toContainText('IURAN_WARGA');
    await expect(page.locator('table')).toContainText('+ Rp 100.000');

    // Expense transaction
    await page.getByRole('button', { name: '+ Transaksi Kas RT' }).click();
    await page.getByRole('button', { name: 'Pengeluaran (Expense)' }).click();
    await page.selectOption('#txCategory', 'OPERASIONAL_RT');
    await page.fill('#txAmount', '40000');
    await page.getByRole('button', { name: 'Simpan Transaksi' }).click();
    await expect(page.locator('table')).toContainText('OPERASIONAL_RT');

    // Recalculation: income +100.000, saldo +60.000
    const incomeAfter = await readIncome(page);
    expect(incomeAfter).toBe(incomeBefore + 100000);
    const saldoAfter = await readSaldo(page);
    expect(saldoAfter).toBe(saldoBefore + 60000);
  });

  test('multi-fund management — create fund and record transaction scoped to the fund', async ({ page }) => {
    await page.goto('/financial');
    const ts = Date.now();
    const fundName = `Kas Karang Taruna ${ts}`;

    // Open Add Fund Modal
    await page.getByRole('button', { name: '+ Kantong Kas Baru' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Kantong Kas Baru' })).toBeVisible();
    await page.fill('#fundName', fundName);
    await page.selectOption('#fundType', 'youth');
    await page.fill('#fundDesc', 'Kas khusus pemuda dan 17-an');
    await page.getByRole('button', { name: 'Simpan Kantong Kas' }).click();

    // Verify fund tab shows the new fund
    await page.getByRole('button', { name: /^Kantong Kas/ }).click();
    await expect(page.locator('table')).toContainText(fundName);

    // Record income transaction assigned to this new fund
    await page.getByRole('button', { name: '+ Transaksi Kas RT' }).click();
    await page.selectOption('#txFund', { label: fundName });
    await page.selectOption('#txCategory', 'DONASI');
    await page.fill('#txAmount', '75000');
    await page.getByRole('button', { name: 'Simpan Transaksi' }).click();

    // Verify transaction row displays the assigned fund name
    await page.getByRole('button', { name: /^Transaksi Kas RT/ }).click();
    await expect(page.locator('table')).toContainText(fundName);
    await expect(page.locator('table')).toContainText('+ Rp 75.000');
  });

  test('financial transactions are append-only — no edit/delete actions in the UI', async ({ page }) => {
    await page.goto('/financial');
    await page.getByRole('button', { name: /^Transaksi Kas RT/ }).click();

    // The transactions table never offers edit/delete buttons
    const txButtons = page.locator('table').getByRole('button');
    await expect(txButtons).toHaveCount(0);
  });
});
