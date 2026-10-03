# Panduan Local Domain & Multi-Tenant Setup — Sitransparan RT/RW

Dokumen ini menjelaskan konfigurasi domain lokal untuk pengujian multi-tenant berbasis subdomain (`<slug>.openrt.local`) dan custom domain pada lingkungan pengembangan (*local development*).

---

## 1. Konsep & Arsitektur Domain

Setiap RT pada aplikasi ini bertindak sebagai **tenant** yang terisolasi. Aplikasi mendukung dua jenis identitas domain:

1. **Subdomain Otomatis**: `<slug>.openrt.local` (contoh: `rt-003.openrt.local`).
2. **Custom Domain**: Domain mandiri yang didaftarkan oleh SuperAdmin (contoh: `rt01.perumahan.com`).

Frontend berjalan di port `3000` (reverse proxy Nginx yang meneruskan panggilan `/api/*` ke backend Go di container).

---

## 2. Setup DNS / Hosts Lokal

Sistem operasi memerlukan pemetaan nama host `*.openrt.local` ke alamat loopback `127.0.0.1`.

### Opsi A: Pemetaan Manual `/etc/hosts` (Sudah Terpasang)

Tambahkan entri berikut ke `/etc/hosts` (Linux/macOS) atau `C:\Windows\System32\drivers\etc\hosts` (Windows):

```text
127.0.0.1 openrt.local rt-003.openrt.local rt-004.openrt.local app.openrt.local api.openrt.local
```

Untuk menambahkan subdomain baru:
```bash
echo "127.0.0.1 <slug-baru>.openrt.local" | sudo tee -a /etc/hosts
```

---

### Opsi B: Wildcard Otomatis Menggunakan DNS Publik (Tanpa Edit Hosts)

Gunakan layanan wildcard DNS seperti `nip.io` agar semua subdomain otomatis mengarah ke `127.0.0.1`.

1. Atur environment variable:
   - Backend: `TENANT_BASE_DOMAIN=127.0.0.1.nip.io`
   - Frontend: `VITE_TENANT_BASE_DOMAIN=127.0.0.1.nip.io`
2. Akses tenant langsung tanpa ubah hosts:
   - `http://sitransparan.127.0.0.1.nip.io:3000`
   - `http://rt-003.127.0.0.1.nip.io:3000`
   - `http://rt-xxx.127.0.0.1.nip.io:3000`

---

## 3. Struktur URL Aplikasi

Setelah perbaikan arsitektur routing (`docs/domains-and-routing.md`), rute terbagi menjadi:

### A. Portal Publik (Root Path)
Dapat diakses oleh warga tanpa login. Konten yang tampil otomatis menyesuaikan subdomain tenant yang sedang dibuka:

| Path | Halaman / Deskripsi |
|---|---|
| `/` | Kabar Lingkungan (Pengumuman, Kas Transparan, Polling Warga) |
| `/usulan` | Aspirasi Warga & Kebutuhan Bersama |
| `/agenda` | Jadwal & Agenda Kegiatan Lingkungan |
| `/login` | Halaman Masuk / Pendaftaran Akun |

*Catatan: Rute lama `/public/announcements`, `/public/aspirations`, dan `/public/events` otomatis dialihkan (redirect) ke rute baru demi backward-compatibility.*

### B. Panel Pengurus Internal (`/admin` Namespace)
Memerlukan autentikasi JWT dan role pengurus (`admin_rt` atau `superadmin`):

| Path | Halaman / Deskripsi | Role Akses |
|---|---|---|
| `/admin` | Dashboard Utama Pengurus | `admin_rt`, `superadmin` |
| `/admin/residents` | Pengelolaan Data Warga & Verifikasi NIK | `admin_rt`, `superadmin` |
| `/admin/financial` | Kas, Kategori Iuran, Verifikasi Pembayaran | `admin_rt`, `superadmin` |
| `/admin/events` | Rencana Kegiatan & Anggaran Biaya (RAB) | `admin_rt`, `superadmin` |
| `/admin/meetings` | Notulen Rapat & Action Items | `admin_rt`, `superadmin` |
| `/admin/aspirations`| Respon Aspirasi & Kebutuhan Komunitas | `admin_rt`, `superadmin` |
| `/admin/announcements`| Buat Pengumuman & Dokumen Digital | `admin_rt`, `superadmin` |
| `/admin/users` | Manajemen Pengguna & Penugasan Tenant | `admin_rt`, `superadmin` |
| `/admin/tenants` | Manajemen Tenant RT Baru | `superadmin` |

---

## 4. Resolusi Host & Endpoint API Backend

Backend menyediakan endpoint publik untuk verifikasi identitas tenant dari host header:

```http
GET /api/v1/t/resolve?host=rt-003.openrt.local
Response: 200 OK
{
  "slug": "rt-003"
}
```

```http
GET /api/v1/t/rt-003/info
Response: 200 OK
{
  "data": {
    "id": "46419b3c-e18b-4756-bbb9-285b7e30e76f",
    "name": "rt 003",
    "slug": "rt-003",
    "domain": "rt-003.openrt.local",
    "status": "active"
  }
}
```

---

## 5. Verifikasi di Lingkungan Lokal

Jalankan perintah berikut untuk menguji konektivitas:

```bash
# 1. Uji resolusi DNS host
ping -c 1 rt-003.openrt.local

# 2. Uji HTTP status portal frontend
curl -sI -H "Host: rt-003.openrt.local" http://rt-003.openrt.local:3000/

# 3. Uji API Tenant Info melalui reverse proxy frontend
curl -s http://rt-003.openrt.local:3000/api/v1/t/rt-003/info
```

Buka URL di browser:
- Portal Tenant RT 003: `http://rt-003.openrt.local:3000`
- Portal Tenant Default: `http://openrt.local:3000` atau `http://localhost:3000`
- Panel Admin: `http://openrt.local:3000/admin`
