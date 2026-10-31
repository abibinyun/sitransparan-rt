import { describe, it, expect } from 'vitest';
import { validatePanicPayload, validateVacancyPayload } from '../../../utils/safetyValidation';

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
