---
title: "Modul Kependudukan & Manajemen Rumah"
description: "Pengelolaan data warga, kartu keluarga, enkripsi NIK, dan pemetaan rumah serta token QR"
tags:
  - module
  - demography
  - residents
  - houses
---

# 👥 Modul Kependudukan & Manajemen Rumah

Modul ini mengelola siklus hidup data warga, kartu keluarga (KK), verifikasi pendaftaran warga, data anggota keluarga, serta data kepemilikan dan token QR rumah di wilayah RT.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/resident.go`, `backend/internal/domain/house.go`
- **Database Tables**: `tenant_<slug>.residents`, `tenant_<slug>.family_members`, `tenant_<slug>.houses`, `tenant_<slug>.house_residents`, `tenant_<slug>.house_qr_tokens`
- **Repository**: `backend/internal/repository/resident_repository.go`, `backend/internal/repository/house_repository.go`
- **Usecase**: `backend/internal/usecase/resident_usecase.go`, `backend/internal/usecase/house_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/resident_handler.go`, `backend/internal/delivery/http/house_handler.go`
- **Frontend Page & Components**:
  - `frontend/src/pages/ResidentsPage.tsx`
  - `frontend/src/components/SearchableResidentSelect.tsx` (komponen pencarian resident berbasis dropdown UI kustom)
  - `frontend/src/components/ResidentModal.tsx`, `FamilyMemberModal.tsx`
  - `frontend/src/components/HouseModal.tsx`, `HouseQRModal.tsx`
- **E2E Tests**: `tests/e2e/residents/residents.spec.ts`, `tests/e2e/residents/houses.spec.ts`

---

## 2. Fitur & Aturan Bisnis Utama

### A. Enkripsi dan Blind Index NIK
Nomor Induk Kependudukan (NIK) dilindungi secara hukum:
1. NIK didekripsi hanya saat ditampilkan kepada admin yang berwenang di antarmuka web.
2. Di database, nilai NIK asli dienkripsi menggunakan AES-256-GCM (`nik_encrypted`).
3. Kolom `nik_hash` (HMAC-SHA256) digunakan untuk validasi keunikan dan pencarian instan tanpa membuka enkripsi.

### B. Status Persetujuan Warga (Approval Flow)
Saat warga melakukan pendaftaran mandiri:
- Data tersimpan dengan status `pending`.
- `admin_rt` memvalidasi kesesuaian dokumen KTP/KK.
- Admin dapat menyetujui (`status = 'approved'`) atau menolak (`status = 'rejected'`) dengan mencantumkan alasan.
- Hanya warga berstatus `approved` yang dapat ditautkan ke rumah atau dicatatkan iurannya.

### C. Manajemen Rumah & Akses QR Token Warga (`/claim`)
- Setiap rumah (`houses`) memiliki nomor rumah, blok, RT/RW, dan status hunian (`occupied`, `vacant`, `rented`).
- Relasi `house_residents` memetakan kepala keluarga dan anggota keluarga ke rumah tertentu.
- **Akses Inklusif Berbasis Token QR (1 Rumah = 1 Token)**:
  - Stiker QR ditempel di rumah fisik warga. Warga memindai QR dan diarahkan ke rute `/claim?token=...&slug=...` (`ClaimHouseTokenPage.tsx`).
  - Frontend memverifikasi token ke endpoint `GET /api/v1/house-access/claim`.
  - Backend menerbitkan JWT terautentikasi dengan peran `resident` yang terikat langsung ke `house_id` dan `tenant_id` bersangkutan tanpa mewajibkan warga lansia mengingat kata sandi email yang rumit.
  - Warga yang telah mengklaim dapat langsung melihat buku tabungan bank sampah KK, riwayat pembayaran iuran rumah, dan memberikan suara pada polling RT dengan scope `house`.
  - Admin dapat merotasi token atau mereset PIN rumah jika stiker QR hilang atau rusak melalui endpoint `POST /api/v1/admin/houses/{id}/reset-token`.

---

## 3. Hubungan Lintas Dokumen

- [[01-architecture/authentication-and-rbac|Autentikasi & Proteksi NIK]]
- [[02-modules/keuangan-and-dues|Integrasi Iuran per Kepala Keluarga]]
- [[02-modules/bank-sampah|Integrasi Penyetoran Sampah per KK]]
- [[00-MOC|Kembali ke MOC]]
