---
title: "Modul Interaksi Sosial & Jajak Pendapat (Polls)"
description: "Reaksi warga terhadap kabar, polling jajak pendapat 2-6 opsi, dan gamifikasi lencana"
tags:
  - module
  - social
  - polls
  - gamification
---

# 🗳️ Modul Interaksi Sosial & Jajak Pendapat (Polls)

Modul ini memfasilitasi interaksi sosial modern antarwarga lingkungan: jajak pendapat keputusan bersama (*polling*) dan reaksi apresiasi atas berita RT.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/poll.go`, `backend/internal/domain/reaction.go`
- **Database Tables**:
  - `tenant_<slug>.reactions` (reaksi `like`, `support`, `applause` 1-ke-1)
  - `tenant_<slug>.polls` (header pertanyaan jajak pendapat)
  - `tenant_<slug>.poll_options` (opsi pilihan 2 hingga 6 opsi)
  - `tenant_<slug>.poll_votes` (catatan suara per warga)
- **Repository**: `backend/internal/repository/poll_repository.go`, `backend/internal/repository/reaction_repository.go`
- **HTTP Delivery**: `backend/internal/delivery/http/poll_handler.go`, `backend/internal/delivery/http/reaction_handler.go`
- **Frontend Page & Components**:
  - `frontend/src/pages/PollsPage.tsx` (`/admin/polls`)
  - `frontend/src/components/polls/PollModal.tsx`
  - `frontend/src/components/ReactionsBar.tsx`
- **E2E Tests**: `tests/e2e/polls/polls.spec.ts`

---

## 2. Fitur & Logika Bisnis Utama

### A. Jajak Pendapat (2–6 Opsi Pilihan)
- Admin RT dapat membuat polling musyawarah (misal: penentuan warna cat gapura, pemilihan jadwal kerja bakti).
- Sistem membatasi minimal 2 opsi dan maksimal 6 opsi pilihan.
- Integritas Satu Suara: Setiap warga hanya berhak memberikan 1 suara (`poll_votes` memiliki unique constraint pada `(poll_id, user_id)`).

### B. Gamifikasi Lencana Warga (Citizen Badges)
Untuk memacu keaktifan warga dalam gotong royong dan bayar iuran, sistem menyematkan badge otomatis:
- `Warga Baru` (pendaftar baru < 30 hari).
- `Warga Teladan` (lunas iuran 6 bulan berturut-turut tanpa tunggakan).
- `Pejuang Lingkungan` (aktif menyetor sampah ke bank sampah setiap bulan).
- `Utusan Warga` (sering hadir dalam musyawarah RT).

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/kabar-and-documents|Reaksi pada Pengumuman]]
- [[02-modules/notulen-and-meetings|Polling sebagai Referensi Rapat]]
- [[00-MOC|Kembali ke MOC]]
