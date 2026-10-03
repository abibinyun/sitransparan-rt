---
title: "Authentication & Role-Based Access Control (RBAC)"
description: "Sistem autentikasi JWT HS256, peran pengguna, enkripsi NIK, dan matriks hak akses"
tags:
  - architecture
  - security
  - authentication
  - rbac
---

# 🔐 Authentication & Role-Based Access Control (RBAC)

SiTransparan RT/RW menerapkan prinsip keamanan ketat: otorisasi diturunkan langsung dari database (`tenant_users JOIN roles`), bukan dari input pengguna atau klaim token yang tidak terverifikasi.

---

## 1. Mekanisme Autentikasi

### A. Login & Rotasi Token (`POST /api/v1/auth/login`)
- Menerima payload JSON: `{ "email": "...", "password": "..." }`.
- Verifikasi kata sandi menggunakan algoritma **bcrypt**.
- Mengambil tenant dan role aktif dari tabel `public.tenant_users`.
- Menghasilkan dua jenis token:
  1. **Access Token (JWT HS256)**: Masa berlaku **15 menit** untuk otorisasi cepat request API.
  2. **Refresh Token**: String 32-byte acak kriptografis (`crypto/rand`) dengan masa berlaku **14 hari**. Hash SHA-256 disimpan di tabel `public.refresh_tokens`.

### B. Rotasi Refresh Token Otomatis (`POST /api/v1/auth/refresh`)
- Frontend Axios response interceptor mendeteksi HTTP 401, menahan queue request sementara, dan memanggil endpoint ini.
- Server memverifikasi token hash di `public.refresh_tokens`.
- **Reuse Detection**: Jika token yang sudah di-revoke dicoba pakai ulang, seluruh sesi user tersebut dicabut seketika (indikasi pencurian token).
- Jika valid, token lama di-revoke (`revoked_at = NOW()`) dan diganti refresh token baru (Token Rotation).

### C. Logout & Sesi Revocation Server-Side
- `POST /api/v1/auth/logout`: Mencabut refresh token aktif dari database sehingga tidak bisa diperpanjang lagi.
- `POST /api/v1/admin/users/{id}/revoke-sessions`: Admin RT atau Superadmin dapat memutus paksa seluruh sesi login user tertentu jika akun dicurigai disusupi.

### D. Struktur Klaim JWT (Access Token)
```json
{
  "sub": "user-uuid",
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid-or-empty-for-superadmin",
  "role": "superadmin | admin_rt | resident",
  "iat": 1729000000,
  "exp": 1729086400
}
```

### C. Alih Tenant (`POST /api/v1/auth/switch-tenant`)
- Pengguna yang terdaftar di multi-tenant dapat berganti tenant aktif secara aman.
- Server memverifikasi keanggotaan aktif pengguna pada tenant target di `public.tenant_users`.
- Server menerbitkan JWT baru dengan klaim `tenant_id` dan `role` yang diperbarui.

---

## 2. Empat Peran Pengguna (The 4 Canonical Roles)

Aplikasi secara ketat mengenal 4 peran (`backend/internal/domain/auth.go`, ditambahkan via migrasi `000048_add_operator_role`):

| Peran | Scope | Deskripsi Hak Akses |
|---|---|---|
| `superadmin` | Global Platform | Manajemen tenant (`/superadmin/tenants`), kelola seluruh user, audit platform, bypass isolasi tenant jika diperlukan. |
| `admin_rt` | Single Tenant | Pengurus RT/RW: hak administratif penuh kelola warga, kas/keuangan, bank sampah, inventaris, agenda, notulen, dan user akun RT. |
| `operator` | Single Tenant | Staf / Petugas Operasional RT: input data operasional harian (warga, catat iuran, timbang sampah, agenda, notulen) tanpa hak pengelolaan akun pengguna RT (`/admin/users`). |
| `resident` | Single Tenant | Warga: akses buku tabungan sampah KK sendiri, bayar iuran, voting polling, usul aspirasi, lihat laporan kas transparan. |

---

## 3. Matriks Otorisasi RBAC

| Fitur / Endpoint | Publik Anonim | Resident (Warga) | Operator (Staf RT) | Admin RT | Superadmin |
|---|:---:|:---:|:---:|:---:|:---:|
| Feed Pengumuman Publik (`/kabar`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Detail Pengumuman Rahasia (`residents_only`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Lapor Aspirasi Anonim | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tanggapi / Ubah Status Aspirasi | ❌ | ❌ | ✅ | ✅ | ✅ |
| Lihat Kas Transparan (Ringkasan) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Catat Transaksi Kas / Iuran Warga | ❌ | ❌ | ✅ | ✅ | ✅ |
| Verifikasi Pembayaran Iuran | ❌ | ❌ | ✅ | ✅ | ✅ |
| Tambah / Edit Kategori Sampah | ❌ | ❌ | ✅ | ✅ | ✅ |
| Setor Sampah Warga | ❌ | ❌ | ✅ | ✅ | ✅ |
| Lihat Tabungan Sampah Sendiri | ❌ | ✅ (KK sendiri) | ✅ (Semua KK) | ✅ (Semua KK) | ✅ |
| Kelola Notulen Rahasia (`confidential`) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manajemen Akun Pengguna RT (`/admin/users`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tambah / Non-aktifkan Tenant | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Keamanan Data Pribadi: Enkripsi NIK & Data Warga

Sesuai UU Perlindungan Data Pribadi (PDP), Nomor Induk Kependudukan (NIK) dilindungi dengan standar kriptografi:
- **Enkripsi**: Algoritma **AES-256-GCM** dengan IV acak per-record. NIK disimpan dalam kolom `nik_encrypted` (tipe `TEXT`).
- **Pencarian Cepat (Blind Index)**: Menggunakan **HMAC-SHA256** dengan secret key server (`HMAC_SECRET_KEY`). Disimpan dalam kolom `nik_hash` berindeks B-Tree.
- Fungsi lookup NIK:
  ```go
  // backend/pkg/crypto/crypto.go
  hash := crypto.HMACSHA256(rawNIK, hmacKey)
  // Query SELECT ... WHERE nik_hash = hash
  ```

---

## 5. Hubungan Lintas Dokumen

- [[01-architecture/system-overview|Kembali ke System Overview]]
- [[01-architecture/multi-tenancy|Isolasi Multi-Tenancy]]
- [[02-modules/kependudukan-and-houses|Modul Kependudukan & NIK Encryption]]
- [[00-MOC|Kembali ke MOC]]
