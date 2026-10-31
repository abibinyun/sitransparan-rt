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
