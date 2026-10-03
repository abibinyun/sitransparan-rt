import { describe, it, expect } from 'vitest';

export function validatePanicPayload(alertType: string, description: string): string | null {
  if (!alertType || !['medical', 'fire', 'crime', 'other'].includes(alertType)) {
    return 'Jenis darurat tidak valid';
  }
  if (!description || description.trim().length < 3) {
    return 'Keterangan darurat minimal 3 karakter';
  }
  return null;
}

export function validateVacancyPayload(startDate: string, endDate: string, contact: string): string | null {
  if (!startDate || !endDate) {
    return 'Tanggal mulai dan selesai wajib diisi';
  }
  if (new Date(startDate) > new Date(endDate)) {
    return 'Tanggal selesai tidak boleh sebelum tanggal mulai';
  }
  if (!contact || contact.trim().length < 8) {
    return 'Nomor kontak darurat tidak valid';
  }
  return null;
}

describe('Safety Center Validation Logic', () => {
  it('validatePanicPayload menolak alert_type tidak valid', () => {
    expect(validatePanicPayload('alien_invasion', 'Tolong')).toBe('Jenis darurat tidak valid');
    expect(validatePanicPayload('medical', 'Tolong pingsan')).toBeNull();
  });

  it('validateVacancyPayload memvalidasi rentang tanggal dan nomor HP darurat', () => {
    expect(validateVacancyPayload('2026-12-25', '2026-12-20', '0812345678')).toBe(
      'Tanggal selesai tidak boleh sebelum tanggal mulai'
    );
    expect(validateVacancyPayload('2026-12-20', '2026-12-25', '123')).toBe(
      'Nomor kontak darurat tidak valid'
    );
    expect(validateVacancyPayload('2026-12-20', '2026-12-25', '08123456789')).toBeNull();
  });
});
