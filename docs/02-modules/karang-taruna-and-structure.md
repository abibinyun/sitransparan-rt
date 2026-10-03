---
title: "Modul Karang Taruna & Struktur Kepengurusan"
description: "Pengelolaan struktur organisasi RT dan Karang Taruna, periode masa bakti, dan portal profil pemuda"
tags:
  - module
  - governance
  - youth
  - structure
---

# 🏛️ Modul Karang Taruna & Struktur Kepengurusan

Modul ini mengelola struktur formal kepengurusan rukun tetangga (Ketua RT, Sekretaris, Bendahara, Seksi-Seksi) serta struktur organisasi pemuda Karang Taruna unit RT.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/karang_taruna.go`, `backend/internal/domain/rt_structure.go`
- **Database Tables**:
  - `tenant_<slug>.rt_periods`, `tenant_<slug>.rt_members` (struktur RT)
  - `tenant_<slug>.karang_taruna_periods`, `tenant_<slug>.karang_taruna_members`, `tenant_<slug>.karang_taruna_configs` (struktur KT)
- **Repository**: `backend/internal/repository/karang_taruna_repository.go`
- **Usecase**: `backend/internal/usecase/karang_taruna_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/karang_taruna_handler.go`
- **Frontend Page & Components (Modular)**:
  - `frontend/src/pages/KarangTarunaPage.tsx`
  - `frontend/src/components/karang-taruna/RTStructureTab.tsx` (Tab struktur pengurus RT)
  - `frontend/src/components/karang-taruna/KTStructureTab.tsx` (Tab struktur Karang Taruna)
  - `frontend/src/components/karang-taruna/RTPeriodModal.tsx`, `RTMemberModal.tsx`
  - `frontend/src/components/karang-taruna/KTPeriodModal.tsx`, `KTMemberModal.tsx`
- **Public Portal View**: `frontend/src/pages/PublicKarangTarunaPage.tsx` (`/karang-taruna`)
- **E2E Tests**: `tests/e2e/karang-taruna/karang-taruna.spec.ts`

---

## 2. Fitur & Logika Bisnis Utama

### A. Periode Masa Bakti (Periods)
- Setiap periode memiliki tahun mulai, tahun selesai (misal: 2024–2027), dan status (`active`, `archived`, `draft`).
- Hanya boleh ada **satu periode aktif** dalam satu waktu. Mengaktifkan periode baru secara otomatis mengarsipkan periode sebelumnya.

### B. Konfigurasi Seksi & Peran Fleksibel (JSONB Config)
- Posisi pengurus tidak di-hardcode. Tabel `karang_taruna_configs` menyimpan JSONB array untuk seksi bidang (e.g. *Seksi Olahraga*, *Seksi Humas & Media*, *Seksi Kerohanian*).
- Setiap pengurus dapat ditautkan ke data warga terverifikasi (`resident_id`) atau diinput manual nama dan fotonya jika belum terdaftar.

### C. Presensi Giat & Honor Petugas Sampah (`waste_attendance`, Migration 000049)
- Mengelola jadwal giat piket kerja bakti atau pengangkutan sampah lingkungan oleh pemuda.
- Tabel `waste_attendance` dan `waste_attendance_members` mencatat tanggal kegiatan, daftar pemuda/petugas yang hadir, serta besaran uang lelah / honor per orang.
- Tab **Petugas & Piket** (`WasteAttendanceTab.tsx`) di halaman Karang Taruna memungkinkan pencatatan daftar hadir dan total honor yang disalurkan secara transparan.

### D. Bagan Organisasi Visual di Portal Publik
- Pengunjung publik dapat melihat susunan pengurus RT dan pemuda Karang Taruna secara elegan di URL `/karang-taruna` lengkap dengan kontak narahubung resmi dan program kerja unggulan.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/kependudukan-and-houses|Tautan Profil ke Data Warga]]
- [[02-modules/bank-sampah|Peran Pemuda dalam Pengelolaan Bank Sampah]]
- [[02-modules/portal-transparansi-publik|Tampilan Profil Publik /karang-taruna]]
- [[00-MOC|Kembali ke MOC]]
