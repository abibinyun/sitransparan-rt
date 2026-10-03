import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileExtension, isAllowedFileType, sanitizeFilename } from '../file';

describe('File Utilities', () => {
  it('formatFileSize memformat bytes ke KB dan MB secara presisi', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('getFileExtension mengambil ekstensi berkas dengan huruf kecil', () => {
    expect(getFileExtension('laporan_keuangan.PDF')).toBe('pdf');
    expect(getFileExtension('foto_kegiatan.jpeg')).toBe('jpeg');
    expect(getFileExtension('berkas_tanpa_ekstensi')).toBe('');
  });

  it('isAllowedFileType memeriksa ekstensi yang diizinkan', () => {
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    expect(isAllowedFileType('dokumen.pdf', allowed)).toBe(true);
    expect(isAllowedFileType('gambar.PNG', allowed)).toBe(true);
    expect(isAllowedFileType('script.exe', allowed)).toBe(false);
  });

  it('sanitizeFilename membersihkan karakter berbahaya', () => {
    const safe = sanitizeFilename('../../etc/passwd.jpg');
    expect(safe).not.toContain('..');
    expect(safe).not.toContain('/');
  });
});
