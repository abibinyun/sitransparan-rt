# Multi-Tenant Wildcard Subdomain & Tenant Architecture Blueprint

**Version:** 1.0.0  
**Domain Baseline:** `*.openrt.local`  

---

## 1. Ringkasan & Tujuan Utama

Sistem SiTransparan RT adalah aplikasi SaaS multi-tenant berbasis komunitas RT.  
Dokumen ini mendefinisikan arsitektur routing domain, penanganan subdomain otomatis (`<slug>.openrt.local`), serta prilaku landing page publik per tenant RT.

### Aturan Utama Routing Domain:
1. Setiap Tenant RT memiliki **Subdomain Default** berbasis **Slug** dengan pola: `<slug>.openrt.local`.
   - Contoh: Tenant `RT 003` → Slug `rt-003` → Subdomain Default: `rt-003.openrt.local`.
2. Jika pembuatan/pengubahan Tenant dilakukan dengan **Custom Domain dikosongkan**, sistem secara otomatis mengisi dan menggunakan `<slug>.openrt.local`.
3. URL `http://<slug>.openrt.local/` berfungsi sebagai **Home / Landing Page Publik** khusus untuk Tenant RT tersebut. Pengunjung umum (unauthenticated) yang membuka URL ini langsung melihat data transparansi publik milik RT 003 (pengumuman publik, kegiatan/keuangan publik, aspirasi warga).
4. Portal Platform Management / SuperAdmin berada di `http://app.openrt.local/` atau `http://openrt.local/`.
5. API Server berada di `http://api.openrt.local/` (atau diproxy melalui domain masing-masing tenant pada `/api/v1/`).

---

## 2. Struktur Domain & Routing Multi-Tenant

| Komponen | Pattern Domain / Host | Fungsi / Deskripsi | Akses Publik / Auth |
| :--- | :--- | :--- | :--- |
| **Main App / SuperAdmin** | `app.openrt.local` / `openrt.local` | Platform dashboard, manajemen tenant platform oleh SuperAdmin, portal pendaftaran RT baru. | Auth (SuperAdmin) |
| **API Server** | `api.openrt.local` | Endpoint utama backend Go HTTP API. | Mixed (Public/Auth) |
| **Default Tenant Domain** | `rt-003.openrt.local` | Landing page publik & portal warga/admin RT 003. | Public Home & Auth RT 003 |
| **Second Tenant Domain** | `rt-004.openrt.local` | Landing page publik & portal warga/admin RT 004. | Public Home & Auth RT 004 |
| **Custom Domain (Opsional)**| `rt003.perumahan.com` | Custom domain khusus yang di-map ke tenant RT 003. | Public Home & Auth RT 003 |

---

## 3. Perilaku Public Landing Page Per Tenant (`http://<slug>.openrt.local`)

Ketika pengunjung atau warga mengakses `http://rt-003.openrt.local`:

1. **Deteksi Subdomain di Frontend**:
   - Application Router membaca `window.location.hostname` (`rt-003.openrt.local`).
   - Ekstrak slug `rt-003`.
   - Set konteks tenant aktif di frontend store (`activeTenantSlug = "rt-003"`).

2. **Public Home / Portal Transparansi Publik (`/`)**:
   - Jika pengguna **belum login (unauthenticated)**, sistem langsung menampilkan **Portal Transparansi Publik RT 003**:
     - **Pengumuman Publik RT 003**: Berita, edaran, dan dokumen publik RT 003.
     - **Agenda & Kegiatan RT 003**: Jadwal kerja bakti, rapat warga, dan transparansi anggaran kegiatan RT 003.
     - **Aspirasi & Usulan Publik**: Daftar usulan kebutuhan warga RT 003.
   - Tombol **"Login Warga / Pengurus"** tersedia di pojok kanan atas untuk login ke Dashboard Admin RT 003 / Warga RT 003.

3. **Routing Internal Tenant**:
   - `http://rt-003.openrt.local/` → Public Transparency Portal RT 003
   - `http://rt-003.openrt.local/login` → Form Login Khusus Warga/Admin RT 003
   - `http://rt-003.openrt.local/dashboard` → Dashboard Internal Warga & Admin RT 003

---

## 4. Aturan Pembuatan & Otomatisasi Slug / Domain di SuperAdmin

Saat SuperAdmin mendaftarkan Tenant RT baru:

1. **Input Form**:
   - **Nama RT**: Misal `"RT 003 RW 05"`
   - **Slug**: Terisi otomatis dari Nama RT menjadi `"rt-003-rw-05"` (lowercase, huruf/angka & tanda hubung). Boleh diedit manual oleh SuperAdmin.
   - **Custom Domain (Opsional)**: Dikosongkan.

2. **Otomatisasi Default Domain (Backend & Frontend)**:
   - Jika `custom_domain` dikosongkan (empty / null):
     Backend/Frontend otomatis mengisi field `domain` dengan: `<slug>.openrt.local`.
   - Tabel Manajemen Tenant di SuperAdmin menampilkan:
     - **Nama RT**: `RT 003 RW 05`
     - **Slug**: `rt-003-rw-05`
     - **Domain**: `rt-003-rw-05.openrt.local` (Default Subdomain)

---

## 5. Mekanisme Resolusi Context di Backend (`TenantMiddleware`)

Backend Go mengidentifikasi tenant dari request HTTP dengan urutan prioritas berikut:

1. **Resolusi Host Header**:
   - Membaca header `Host` atau `X-Forwarded-Host` (misal `rt-003.openrt.local`).
   - Memeriksa ke database:
     - Pertama: match `tenants.domain = 'rt-003.openrt.local'`
     - Kedua: match `tenants.slug = 'rt-003'`
2. **Resolusi X-Tenant-ID Header**:
   - Jika dikirim oleh frontend via `X-Tenant-ID`.
3. **Resolusi JWT Claim**:
   - `claims.TenantID` dari Bearer token pengguna yang terautentikasi.

Dengan urutan ini, semua endpoint API (`/api/v1/residents`, `/api/v1/financial/summary`, dsb) yang dipanggil dari `rt-003.openrt.local` secara otomatis terisolasi pada database schema & data tenant `rt-003`.

---

## 6. Penyiapan Local Environment (`*.openrt.local`)

Untuk pengembangan lokal (Development Environment):

1. **Pemetaan Host Lokal (`/etc/hosts`)**:
   ```text
   127.0.0.1 app.openrt.local
   127.0.0.1 api.openrt.local
   127.0.0.1 rt-003.openrt.local
   127.0.0.1 rt-004.openrt.local
   ```
2. **Reverse Proxy (Traefik / Docker Compose)**:
   - Router Rule Frontend: `Host(`app.openrt.local`) || HostRegexp(`{subdomain:[a-z0-9-]+}.openrt.local`)`
   - Router Rule Backend API: `Host(`api.openrt.local`)`

---

## 7. Rencana Pengujian E2E (Playwright)

1. **UC-MULTI-01**: Akses `http://rt-003.openrt.local/` tanpa login → Memastikan portal transparansi publik RT 003 tampil dengan data RT 003.
2. **UC-MULTI-02**: Akses `http://rt-004.openrt.local/` tanpa login → Memastikan portal transparansi publik RT 004 tampil terisolasi dari RT 003.
3. **UC-MULTI-03**: SuperAdmin membuat tenant `RT 005` tanpa mengisi custom domain → Memastikan tenant tersimpan dengan domain `rt-005.openrt.local`.
4. **UC-MULTI-04**: Admin RT 003 login di `http://rt-003.openrt.local/login` → Memastikan berhak mengelola warga & keuangan RT 003 saja.
