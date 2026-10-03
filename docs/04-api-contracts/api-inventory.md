---
title: "Inventaris Endpoint API Terverifikasi"
description: "Daftar lengkap endpoint API RESTful, HTTP method, proteksi otorisasi, dan format payload"
tags:
  - api
  - backend
  - contracts
  - rest
---

# 📡 Inventaris Endpoint API Terverifikasi

Seluruh endpoint API berada di bawah base path `/api/v1`. Endpoint dibagi menjadi 4 level otorisasi: Publik, Terautentikasi (Bearer JWT), Admin RT, dan Super Admin.

---

## 1. Endpoint Publik & Transparansi

| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|:---:|---|
| `GET` | `/health` | Publik | Healthcheck status server |
| `POST` | `/auth/login` | Publik | Otentikasi user via email & password (mengembalikan access_token 15m & refresh_token 14d) |
| `POST` | `/auth/register` | Publik | Registrasi akun baru (tanpa tenant) |
| `POST` | `/auth/refresh` | Publik | Rotasi token: tukar refresh_token dengan access_token baru |
| `POST` | `/auth/logout` | Publik | Pencabutan refresh token server-side (revocation) |
| `GET` | `/public/tenants` | Publik | Daftar tenant aktif untuk landing page platform |
| `GET` | `/t/{slug}/info` | Publik | Profil lengkap RT & kontak narahubung |
| `GET` | `/t/{slug}/announcements` | Publik | Feed kabar publik (kategori filter & pagination) |
| `GET` | `/t/{slug}/announcements/{id}` | Publik | Detail berita publik (residents_only disaring) |
| `GET` | `/t/{slug}/aspirations` | Publik | Daftar usulan warga non-rahasia |
| `POST` | `/t/{slug}/aspirations` | Publik | Kirim aspirasi (mendukung mode anonim) |
| `GET` | `/t/{slug}/events` | Publik | Agenda kegiatan RT dan musyawarah |
| `GET` | `/t/{slug}/karang-taruna` | Publik | Struktur pemuda dan program kerja |
| `GET` | `/t/{slug}/waste-bank/summary` | Publik | Metrik total kilogram sampah terkelola |
| `GET` | `/t/{slug}/waste-bank/categories`| Publik | Daftar harga sampah per kg terkini |

---

## 2. Endpoint Pengguna Terautentikasi (Semua Peran)

Header wajib: `Authorization: Bearer <jwt_token>`

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/auth/me` | Mengambil data profil user yang sedang login |
| `GET` | `/auth/tenants` | Daftar tenant di mana user terdaftar |
| `POST` | `/auth/switch-tenant` | Alih tenant aktif dan peroleh token baru |
| `POST` | `/push/subscribe` | Mendaftarkan token push browser ke database |
| `POST` | `/push/unsubscribe` | Membatalkan langganan push notification |
| `GET` | `/polls` | Daftar polling musyawarah |
| `POST` | `/polls/{id}/vote` | Mengirimkan 1 suara ke opsi polling tertentu |
| `POST` | `/reactions` | Mengirimkan reaksi suka/dukungan pada kabar |
| `GET` | `/house-access/claim` | Verifikasi token QR rumah warga dan terbitkan sesi JWT resident |
| `GET` | `/house-access/me` | Profil data rumah warga yang terikat sesi QR |

---

## 3. Endpoint Operasional Admin RT (Pengurus RT)

Memerlukan role: `admin_rt`, `operator`, atau `superadmin`.

### A. Kependudukan & Rumah
- `GET, POST /residents`: Ambil daftar warga & daftarkan warga baru.
- `GET, PUT, DELETE /residents/{id}`: Detail, update, dan soft-delete warga.
- `POST /residents/{id}/approve`: Menyetujui pendaftaran warga.
- `POST /residents/{id}/reject`: Menolak pendaftaran warga.
- `GET, POST /residents/{id}/family`: Ambil dan tambah anggota keluarga.
- `GET, POST /admin/houses`: Master data rumah dan blok.
- `POST /admin/houses/{id}/reset-token`: Rotasi token QR rumah dan reset PIN.
- `POST /houses/{id}/residents`: Menautkan warga penghuni ke rumah.
- `GET /admin/audit-logs`: Audit trail mutasi data administratif RT.

### B. Keuangan & Kas RT
- `GET, POST /financial/funds`: Kelola multi-kantong kas.
- `GET, POST /financial/categories`: Kelola kategori iuran.
- `GET, POST /financial/dues`: Ambil daftar iuran & catat pembayaran iuran warga (mendukung `payment_date`).
- `POST /financial/dues/{id}/verify`: Verifikasi bukti pembayaran warga.
- `GET, POST /financial/transactions`: Catat mutasi pemasukan/pengeluaran kas RT.
- `GET /dashboard/reports/financial/export?format=csv|pdf`: Download laporan keuangan blob.

### C. Bank Sampah, Presensi Piket, & Inventaris
- `GET, POST /waste-bank/categories`: Master kategori dan harga sampah.
- `GET, POST /waste-bank/deposits`: Catat setoran sampah timbangan warga.
- `GET /waste-bank/savings`: Laporan buku tabungan KK.
- `GET, POST /waste-collectors`: Daftar & tambah petugas pemilah/pengangkut sampah.
- `PUT, DELETE /waste-collectors/{id}`: Edit data & nonaktifkan petugas sampah.
- `GET, POST /waste-attendance`: Riwayat kegiatan & catat presensi piket pemuda beserta honor.
- `GET /waste-attendance/{id}`: Detail rincian absensi anggota pada kegiatan tertentu.
- `GET, POST /inventory/items`: Master aset inventaris.
- `GET, POST /inventory/borrowings`: Catat peminjaman & konfirmasi pengembalian.

### D. Notulen, Kabar, dan Dokumen
- `GET, POST /meetings`: Buat agenda pertemuan dan notulen.
- `GET, POST /announcements`: Publikasikan kabar berita RT.
- `GET, POST, PUT, DELETE /documents`: Repositori berkas dokumen resmi RT.
- `PUT /aspirations/{id}`: Tanggapi dan perbarui status aspirasi warga.

---

## 4. Endpoint Platform Super Admin

Memerlukan role: `superadmin`.

- `GET, POST /superadmin/tenants`: Ambil dan daftarkan rukun tetangga baru (auto-provision schema).
- `DELETE /superadmin/tenants/{id}`: Soft-delete/non-aktifkan tenant.
- `GET, POST, PUT /users`: Manajemen akun user global dan penugasan peran.
- `POST /admin/users/{id}/revoke-sessions`: Pencabutan paksa seluruh sesi login user tertentu (Super Admin / Admin RT).

---

## 5. Hubungan Lintas Dokumen

- [[04-api-contracts/openapi-spec|Spesifikasi OpenAPI 3.0]]
- [[01-architecture/authentication-and-rbac|Matriks Hak Akses RBAC]]
- [[00-MOC|Kembali ke MOC]]
