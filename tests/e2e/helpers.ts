import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@sitransparan.rt';
export const ADMIN_PASSWORD = 'password123';
export const SUPERADMIN_EMAIL = 'superadmin@platform.local';
export const SUPERADMIN_PASSWORD = 'admin123';

/** Login through the real login page (optionally on a tenant hostname origin). */
export async function login(page: Page, email: string, password: string, origin = '') {
  await page.goto(`${origin}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata Sandi').fill(password);
  await page.getByRole('button', { name: 'Masuk Akun' }).click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15000 });
}

/** Parse "Rp 50.000" style Indonesian currency text into a number. */
export function parseRp(text: string): number {
  const m = text.match(/Rp\s*([\d.,]+)/);
  if (!m) return 0;
  return Number(m[1].replace(/\./g, '').replace(',', '.'));
}

/** Deterministic unique 16-digit NIK. */
export function nik16(ts: number): string {
  return ('3' + String(ts).padStart(15, '0')).slice(0, 16);
}
