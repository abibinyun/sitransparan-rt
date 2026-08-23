# Production Release Checklist — Sitransparan RT/RW

Dokumen panduan langkah wajib sebelum merilis dan menggunakan aplikasi Sitransparan RT/RW di lingkungan nyata.

---

## 1. Storage File Upload (MinIO Real Integration)

- **Status Saat Ini:** `backend/pkg/storage/minio/minio.go` masih berupa stub kosong. File bukti bayar, KTP/KK, kwitansi belanja event, dan dokumen RT belum tersimpan ke storage fisik.
- **Tindakan:**
  - Implementasikan MinIO Go SDK (`github.com/minio/minio-go/v7`) pada `backend/pkg/storage/minio/minio.go`.
  - Pastikan bucket `transparansi-uploads` dibuat otomatis saat server start.
  - Tambahkan route serving file statis `/uploads/*` atau gunakan MinIO Pre-Signed URL untuk download/view file.

---

## 2. Environment Variables & Secret Production

Pastikan file `.env` di server produksi tidak menggunakan secret default:

| Variabel | Wajib Diisi | Cara Generate / Rekomendasi |
|---|---|---|
| `JWT_SECRET` | Ya | `openssl rand -base64 48` (min 32 karakter) |
| `NIK_ENCRYPTION_KEY` | Ya | `openssl rand -base64 32` (tepat 32 bytes) |
| `NIK_HMAC_SECRET` | Ya | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | Ya | Password kuat khusus database produksi |
| `MINIO_ROOT_PASSWORD`| Ya | Password kuat khusus MinIO storage |

---

## 3. Konfigurasi Domain & Reverse Proxy (Traefik / HTTPS)

- **Domain Base:**
  - Ubah `TENANT_BASE_DOMAIN` (backend) dan `VITE_TENANT_BASE_DOMAIN` (frontend build arg) dari `openrt.local` menjadi domain publik (contoh: `sitransparan.id` atau `rt05-melati.com`).
- **Wildcard DNS:**
  - A record: `sitransparan.id` -> IP Server
  - CNAME record: `*.sitransparan.id` -> `sitransparan.id`
- **HTTPS / SSL:**
  - Aktifkan Let's Encrypt ACME resolver di Traefik (`infrastructure/traefik/traefik.yml`) untuk sertifikat SSL otomatis pada wildcard domain.

---

## 4. Rate Limiter Proxy Configuration

- **Masalah:** Di balik Traefik/Nginx, semua request datang dari IP container proxy. Jika `TRUSTED_PROXY_IPS` kosong, seluruh warga akan berbagi 1 kuota IP yang sama dan bisa terkena error `429 Too Many Requests`.
- **Tindakan:**
  - Set `TRUSTED_PROXY_IPS` di `.env` produksi dengan subnet Docker (contoh: `172.16.0.0/12,127.0.0.1`) atau IP proxy terpercaya.

---

## 5. Backup Otomatis Database PostgreSQL

Data kas RT dan data warga bersifat kritis. Siapkan script backup otomatis berkala:

```bash
# Contoh cronjob harian (jam 02:00 pagi)
0 2 * * * docker exec transparansi_postgres pg_dump -U postgres transparansi_rt | gzip > /var/backups/rt/db_$(date +\%Y\%m\%d).sql.gz
```

---

## 6. Password Akun Default

Ganti segera kata sandi default setelah database terpasang:
- `superadmin@platform.local` (default: `admin123`)
- `admin@sitransparan.rt` (default: `password123`)
- Buat akun pengurus RT sesuai SK/struktur RT melalui menu Manajemen Pengguna (`/users`).
