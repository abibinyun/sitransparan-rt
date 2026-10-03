---
title: "Modul Kegiatan, Agenda & RAPB Event"
description: "Manajemen siklus kegiatan warga, kepanitiaan, RAB estimasi vs realisasi, sponsor, dan laporan pertanggungjawaban (LPJ)"
tags:
  - module
  - events
  - budget
  - transparency
---

# 📅 Modul Kegiatan, Agenda & RAPB Event

Modul Kegiatan mengelola agenda lingkungan (17 Agustus, kerja bakti, pengajian, posyandu) dengan transparansi anggaran penuh: RAB estimasi vs realisasi, sponsorship, dan lampiran LPJ.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/event.go` (`Event`, `EventBudget`, `EventParticipant`, `EventSponsor`, `EventReceipt`)
- **Database Tables**:
  - `tenant_<slug>.events` (agenda kegiatan)
  - `tenant_<slug>.event_budgets` (pos rencana anggaran biaya / RAB)
  - `tenant_<slug>.event_participants` (daftar peserta warga)
  - `tenant_<slug>.event_sponsors` (sponsor dan donatur)
  - `tenant_<slug>.event_receipts` (bukti kwitansi pengeluaran kepanitiaan)
- **Repository**: `backend/internal/repository/event_repository.go`
- **Usecase**: `backend/internal/usecase/event_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/event_handler.go`
- **Frontend Page & Components**:
  - `frontend/src/pages/EventsPage.tsx`
  - `frontend/src/pages/PublicEventsPage.tsx` (`/agenda`)
  - `frontend/src/components/EventModal.tsx`
  - `frontend/src/components/EventBudgetModal.tsx` (manajemen RAB pos estimasi & realisasi)
- **E2E Tests**: `tests/e2e/events/events-workflow.spec.ts`

---

## 2. Fitur & Aturan Bisnis Terverifikasi

### A. Agregasi Anggaran RAB Otomatis
- Endpoint `GET /api/v1/events` secara otomatis menyertakan kalkulasi agregat `budget` (total estimasi dan total realisasi).
- Kartu kegiatan menampilkan perbandingan visual antara anggaran yang direncanakan dengan dana riil yang digunakan.

### B. Filter Status di Backend
- Query parameter `GET /api/v1/events?status=planned|ongoing|completed|cancelled` diproses langsung di level database query, menyinkronkan filter UI dengan hasil backend.

### C. Dokumen Pendukung (Proposal & LPJ)
- Setiap kegiatan mendukung `attachment_url` (berkas proposal kegiatan) dan `report_url` (laporan pertanggungjawaban/LPJ final) yang dapat diunduh oleh warga secara transparan.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/keuangan-and-dues|Integrasi Alokasi Dana dari Kas RT]]
- [[02-modules/portal-transparansi-publik|Kalender Agenda di /agenda]]
- [[00-MOC|Kembali ke MOC]]
