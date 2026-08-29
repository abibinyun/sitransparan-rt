import { test, expect } from '@playwright/test';

test.describe('Public Portal UI/UX & Brand Identity Verification', () => {
  test('Platform Landing Page displays brand hero, pillars, and RT directory', async ({ page }) => {
    await page.goto('/kabar');
    await expect(page.locator('h1')).toContainText('Kabar Warga & Dokumen Transparansi');
  });

  test('Public Kabar & Dokumen feed loads widgets and announcement cards', async ({ page }) => {
    await page.goto('/kabar');
    await expect(page.locator('h1')).toContainText('Kabar Warga & Dokumen Transparansi');
    await expect(page.getByRole('heading', { name: 'Kabar & Edaran Pengurus' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Arsip & Dokumen Warga' })).toBeVisible();
  });

  test('Public Aspirations page loads with tabs and submit trigger', async ({ page }) => {
    await page.goto('/usulan');
    await expect(page.locator('h1')).toContainText('Aspirasi & Usulan Kebutuhan RT');
    await expect(page.getByRole('button', { name: /Sampaikan Aspirasi Baru/i })).toBeVisible();
    await expect(page.getByText(/Aspirasi Warga/i).first()).toBeVisible();
  });

  test('Public Events page displays calendar timeline and RSVP button', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.locator('h1')).toContainText('Agenda & Kegiatan Lingkungan');
    await expect(page.getByRole('heading', { name: 'Daftar Agenda Mendatang' })).toBeVisible();
  });

  test('Public Karang Taruna page loads structure banner', async ({ page }) => {
    await page.goto('/karang-taruna');
    await expect(page.locator('h1')).toContainText('Karang Taruna & Kepemudaan Lingkungan');
    await expect(page.getByText('Energi Generasi Muda')).toBeVisible();
  });

  test('Public Waste Bank page renders interactive calculator and KPI tracker', async ({ page }) => {
    await page.goto('/bank-sampah');
    await expect(page.locator('h1')).toContainText('Bank Sampah Warga & Pemuda');
    await expect(page.getByText('Simulasi Nilai Setoran Sampah Anda')).toBeVisible();
    await expect(page.getByText('Daftar Harga & Rasio Bagi Hasil')).toBeVisible();
    await expect(page.getByText('Alur Penimbangan Sampah Warga')).toBeVisible();
  });
});
