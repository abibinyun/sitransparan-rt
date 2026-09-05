import { test, expect } from '@playwright/test';
import { login } from '../helpers';
import { execSync } from 'child_process';

test.describe('RT 03 Financial Flow Verification (uung@gmail.com)', () => {
  test.beforeEach(() => {
    execSync(`docker compose -f infrastructure/docker-compose.yml exec -T postgres psql -U postgres -d transparansi_rt -c "
      DELETE FROM tenant_rt_003.dues_payments;
      DELETE FROM tenant_rt_003.financial_transactions;
    "`);
  });

  test('verify complete dues separation, fund transfer, and balance calculation', async ({ page }) => {
    // 1. Login as uung@gmail.com
    await login(page, 'uung@gmail.com', 'admin123');
    await expect(page).toHaveURL(/.*\/admin/);

    // 2. Navigate to Financial page
    await page.goto('http://localhost:3000/admin/financial');
    await page.waitForLoadState('networkidle');

    // 3. Catat Iuran Warga baru: Rp 50.000
    await page.locator('#tab-dues').click();

    // Click "+ Bayar / Catat Iuran" -> "Catat Iuran Warga"
    await page.getByRole('button', { name: /Catat Iuran Warga/ }).click();
    await expect(page.getByRole('heading', { name: 'Catat / Bayar Iuran Warga' })).toBeVisible();

    // Pilih warga pertama yang ada
    const residentSelect = page.locator('#duesResident');
    const residentOptions = await residentSelect.locator('option').all();
    if (residentOptions.length > 1) {
      const val = await residentOptions[1].getAttribute('value');
      if (val) await page.selectOption('#duesResident', val);
    }

    // Pilih kategori iuran
    const categorySelect = page.locator('#duesCategory');
    const catOptions = await categorySelect.locator('option').all();
    if (catOptions.length > 1) {
      const val = await catOptions[1].getAttribute('value');
      if (val) await page.selectOption('#duesCategory', val);
    }

    // Isi nominal 50.000
    await page.fill('#duesAmount', '50000');
    await page.getByRole('button', { name: 'Simpan Iuran' }).click();
    await expect(page.getByRole('heading', { name: 'Catat / Bayar Iuran Warga' })).toBeHidden();

    // 4. Verifikasi status iuran jika pending
    await page.getByRole('button', { name: /Iuran Masuk/i }).click();
    const verifyBtn = page.getByRole('button', { name: 'Verifikasi' }).first();
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(1000);
    }

    // 5. Lakukan Penyaluran / Transfer dana iuran ke Kas RT via kartu Pos Iuran
    await page.getByRole('button', { name: /Salurkan Dana/i }).first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Salurkan / Keluarkan Dana Iuran')).toBeVisible();

    // Pilih Pos Iuran Sumber
    const disburseCatSelect = page.locator('#disburseCat');
    const disburseOptions = await disburseCatSelect.locator('option').all();
    if (disburseOptions.length > 1) {
      const val = await disburseOptions[1].getAttribute('value');
      if (val) await page.selectOption('#disburseCat', val);
    }

    // Pilih Opsi: Ke Kantong Kas RT (default sudah fund, klik tombol untuk memastikan)
    await page.getByRole('button', { name: /Ke Kantong Kas RT/i }).click();

    // Pilih Kantong Kas Tujuan
    const targetFundSelect = page.locator('#targetFund');
    const fundOptions = await targetFundSelect.locator('option').all();
    if (fundOptions.length > 1) {
      const val = await fundOptions[1].getAttribute('value');
      if (val) await page.selectOption('#targetFund', val);
    }

    // Isi Jumlah Penyaluran: Rp 30.000
    await page.fill('#disburseAmount', '30000');
    await page.fill('#disburseDesc', 'Transfer dana iuran ke kas RT');

    // Submit penyaluran
    await page.getByRole('button', { name: 'Keluarkan / Salurkan Dana' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.waitForTimeout(1000);

    // 6. Cek tab Transaksi Kas RT
    await page.locator('#tab-transactions').click();
    await page.waitForTimeout(1000);

    // Pastikan ada transaksi masuk 'IURAN_PINDAH_KAS' sebesar Rp 30.000
    await expect(page.getByText(/IURAN_PINDAH_KAS/i).first()).toBeVisible();

    // 7. Cek tab Saldo & Kantong Kas untuk verifikasi angka-angka
    await page.locator('#tab-funds').click();
    await page.waitForTimeout(1000);

    // Saldo Kantong Kas tujuan harus bertambah Rp 30.000 (bukan 50.000, dan bukan 0)
    const kasText = await page.locator('body').textContent();
    expect(kasText).toContain('30.000');

    // 8. Cek kartu Pos Iuran di tab Iuran Warga: Sisa Saldo Bersih harus tepat Rp 20.000 (50.000 - 30.000)
    await page.locator('#tab-dues').click();
    await page.waitForTimeout(1000);

    const iuranPageText = await page.locator('body').textContent();
    expect(iuranPageText).toContain('50.000');
    expect(iuranPageText).toContain('30.000');
    expect(iuranPageText).toContain('20.000');

    // 9. Lakukan Belanja Langsung dari sisa pos iuran (External Expense): Rp 10.000 via kartu Pos Iuran
    await page.getByRole('button', { name: /Salurkan Dana/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Pilih opsi belanja langsung
    await page.getByRole('button', { name: /Belanja Langsung/i }).click();

    // Pilih Pos Iuran Sumber
    if (disburseOptions.length > 1) {
      const val = await disburseOptions[1].getAttribute('value');
      if (val) await page.selectOption('#disburseCat', val);
    }

    // Isi nominal 10.000
    await page.fill('#disburseAmount', '10000');
    await page.fill('#disburseDesc', 'Beli plastik sampah & sapu lidi');
    await page.getByRole('button', { name: 'Keluarkan / Salurkan Dana' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.waitForTimeout(1000);

    // Cek Sisa Saldo akhir pos iuran: harus Rp 10.000 (50k - 30k transfer - 10k belanja)
    const afterExpenseText = await page.locator('body').textContent();
    expect(afterExpenseText).toContain('10.000');

    // 10. Verifikasi Total Dana Global:
    // Total Masuk Global: Rp 50.000 (dari iuran warga, transfer internal 30k tidak dihitung double)
    // Total Keluar Global: Rp 10.000 (belanja langsung eksternal)
    // Total Saldo Kas: Rp 40.000 (30.000 di Kas RT + 10.000 sisa di Pos Iuran)
    expect(afterExpenseText).toContain('Total Saldo Kas');
    expect(afterExpenseText).toContain('40.000');
    expect(afterExpenseText).toContain('Arus Masuk (Income)');
    expect(afterExpenseText).toContain('50.000');
    expect(afterExpenseText).toContain('Arus Keluar (Expense)');
  });
});
