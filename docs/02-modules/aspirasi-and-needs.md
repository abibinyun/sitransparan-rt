---
title: "Modul Aspirasi & Kebutuhan Warga"
description: "Penyampaian usulan warga anonim dan terdaftar, penanganan status oleh pengurus, dan community needs"
tags:
  - module
  - aspirations
  - needs
  - feedback
---

# 💡 Modul Aspirasi & Kebutuhan Warga

Modul ini mendemokratisasi penyampaian aspirasi, kritik, saran, serta kebutuhan sarana lingkungan (*community needs*) langsung dari warga ke pengurus RT/RW.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/aspiration.go`, `backend/internal/domain/community_need.go`
- **Database Tables**:
  - `tenant_<slug>.aspirations` (laporan aspirasi & saran warga)
  - `tenant_<slug>.community_needs` (daftar inventaris kebutuhan fasilitas lingkungan)
- **Repository**: `backend/internal/repository/aspiration_repository.go`, `backend/internal/repository/community_need_repository.go`
- **Usecase**: `backend/internal/usecase/aspiration_usecase.go`, `backend/internal/usecase/community_need_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/aspiration_handler.go`, `backend/internal/delivery/http/community_need_handler.go`
- **Frontend Page & Components**:
  - `frontend/src/pages/AspirationsPage.tsx`
  - `frontend/src/pages/PublicAspirationsPage.tsx` (`/usulan`)
  - `frontend/src/components/aspiration/AspirationModal.tsx`
  - `frontend/src/components/aspiration/AspirationResponseModal.tsx`
- **E2E Tests**: `tests/e2e/aspirations/workflow.spec.ts`

---

## 2. Fitur & Logika Bisnis Utama

### A. Opsi Pengiriman Anonim (Whistleblowing Aman)
- Warga dapat memilih opsi `is_anonymous = true`.
- Sistem menyembunyikan identitas pelapor dari publik dan pengurus jika opsi anonim diaktifkan, mencegah rasa enggan warga saat melayangkan kritik konstruktif.

### B. Siklus Tindak Lanjut Aspirasi
Pengurus RT memproses status aspirasi melalui alur:
`submitted` (baru masuk) -> `reviewed` (ditinjau) -> `in_progress` (sedang dikerjakan) -> `resolved` (selesai) / `rejected` (ditolak dengan alasan).
Setiap perubahan status dapat disertai tanggapan resmi dari pengurus (`response_text`).

### C. Daftar Kebutuhan Komunitas (Community Needs)
- Mencatat daftar kebutuhan lingkungan (seperti: lampu PJU gang, CCTV persimpangan, perbaikan selokan).
- Menampilkan estimasi biaya dan status pengadaan, menjadi rujukan musyawarah anggaran tahunan (RAPB).

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/portal-transparansi-publik|Aspirasi Publik di /usulan]]
- [[02-modules/notulen-and-meetings|Membahas Usulan Warga dalam Notulen Musyawarah]]
- [[00-MOC|Kembali ke MOC]]
