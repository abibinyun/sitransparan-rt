---
title: "Modul Kabar Warga & Dokumen Digital"
description: "Pengumuman multimedia, komentar warga, repositori berkas publik dan internal RT"
tags:
  - module
  - announcements
  - documents
  - media
---

# 📢 Modul Kabar Warga & Dokumen Digital

Modul ini adalah pusat komunikasi satu arah dan dua arah antara pengurus RT dengan warga, dilengkapi repositori arsip digital RT (SK, formulir surat pengantar, tata tertib).

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/announcement.go`, `backend/internal/domain/document.go`
- **Database Tables**:
  - `tenant_<slug>.announcements` (berita kabar & pengumuman)
  - `tenant_<slug>.announcement_comments` (komentar interaktif warga)
  - `tenant_<slug>.documents` (arsip file/dokumen resmi)
- **Repository**: `backend/internal/repository/announcement_repository.go`, `backend/internal/repository/document_repository.go`
- **Usecase**: `backend/internal/usecase/announcement_usecase.go`, `backend/internal/usecase/document_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/announcement_handler.go`, `backend/internal/delivery/http/document_handler.go`
- **Frontend Page & Components**:
  - `frontend/src/pages/AnnouncementsPage.tsx`
  - `frontend/src/pages/DocumentsPage.tsx`
  - `frontend/src/components/announcements/AnnouncementModal.tsx`
  - `frontend/src/components/announcements/AnnouncementDetailModal.tsx`
- **E2E Tests**: `tests/e2e/announcements/announcements-crud.spec.ts`, `tests/e2e/announcements/multi-attachment.spec.ts`

---

## 2. Fitur & Logika Bisnis Utama

### A. Pengumuman Multimedia & Multi-Attachment
- Mendukung array `media_urls` (hingga 10 foto) dan `file_urls` (lampiran PDF/dokumen).
- URL media divalidasi dengan regex skema `http/https`.
- Kategori pengumuman: `pengumuman`, `kegiatan`, `santai`, `info`.

### B. Privasi Pengumuman (`residents_only`)
- Jika flag `residents_only = true`, pengumuman disembunyikan dari pengunjung publik yang belum login di portal `/kabar`.
- Non-warga yang mengakses langsung endpoint detail akan menerima respons 403 atau data disanitasi.

### C. Komentar Warga
- Admin dapat mengaktifkan atau menonaktifkan kolom komentar per pengumuman (`allow_comments`).
- Warga yang terverifikasi dapat berdiskusi dan memberikan masukan di bawah pengumuman.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/portal-transparansi-publik|Feed /kabar di Portal Publik]]
- [[02-modules/social-and-polls|Reaksi Suka/Dukungan Warga]]
- [[00-MOC|Kembali ke MOC]]
