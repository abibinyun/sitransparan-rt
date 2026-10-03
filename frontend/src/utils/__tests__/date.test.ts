import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime } from '../date';

describe('Date Utilities (Indonesian / WIB)', () => {
  it('formatDate memformat string ISO ke tanggal Indonesia', () => {
    const formatted = formatDate('2026-10-03T10:00:00Z');
    // Format: "3 Oktober 2026"
    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/Oktober/i);
  });

  it('formatDateTime menyertakan jam dan menit', () => {
    const formatted = formatDateTime('2026-10-03T15:30:00+07:00');
    expect(formatted).toContain('2026');
    // Format id-ID menghasilkan "pukul 15.30" atau "15:30"
    expect(formatted).toMatch(/\d{2}[.:]\d{2}/);
  });

  it('formatRelativeTime menangani input invalid dengan fallback aman', () => {
    const fallback = formatRelativeTime('invalid-date');
    expect(fallback).toBe('-');
  });
});
