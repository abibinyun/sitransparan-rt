// Helper untuk normalisasi URL file/gambar agar selalu bisa diakses browser
// tanpa terkena blokir Private Network Access / CORS loopback (localhost:9000).

export function getFileUrl(url?: string | null): string {
  if (!url) return '';

  // Jika URL mengarah ke localhost:9000 MinIO (atau port internal MinIO)
  // ubah path menjadi /api/v1/files/<path> sehingga dilayani oleh proxy backend
  // Contoh input: http://localhost:9000/sitransparan-files/rt-003/ktp/abc.jpg
  // Contoh output: /api/v1/files/rt-003/ktp/abc.jpg
  if (url.includes(':9000') || url.includes('/sitransparan-files/')) {
    const bucketIdx = url.indexOf('/sitransparan-files/');
    if (bucketIdx !== -1) {
      const key = url.substring(bucketIdx + '/sitransparan-files/'.length);
      return `/api/v1/files/${key}`;
    }
  }

  return url;
}
