---
title: "Modul Notulen & Rapat Warga"
description: "Pencatatan musyawarah warga, daftar hadir, keputusan rapat, tindak lanjut, dan hak akses kerahasiaan"
tags:
  - module
  - meetings
  - decisions
  - governance
---

# 📝 Modul Notulen & Rapat Warga

Modul Rapat dan Notulen memfasilitasi tata kelola musyawarah RT/RW mulai dari perencanaan agenda, absensi kehadiran, pencatatan butir keputusan, hingga penugasan rencana tindak lanjut (*action items*).

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/meeting.go`
- **Database Tables**:
  - `tenant_<slug>.meetings` (header rapat & agenda)
  - `tenant_<slug>.meeting_attendees` (daftar hadir warga/tamu)
  - `tenant_<slug>.meeting_decisions` (butir mufakat/keputusan rapat)
  - `tenant_<slug>.meeting_action_items` (tugas tindak lanjut & PIC)
- **Repository**: `backend/internal/repository/meeting_repository.go`
- **Usecase**: `backend/internal/usecase/meeting_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/meeting_handler.go`
- **Frontend Page & Components (Modular)**:
  - `frontend/src/pages/MeetingPage.tsx`
  - `frontend/src/components/meetings/MeetingsTab.tsx` (Tab daftar rapat & filter status)
  - `frontend/src/components/meetings/ActionItemsTab.tsx` (Tab pelacakan tugas & deadline)
  - `frontend/src/components/meetings/MeetingFormModal.tsx` (Modal buat/edit rapat)
  - `frontend/src/components/meetings/ActionItemModal.tsx`, `DecisionModal.tsx`, `AttendeeModal.tsx`
- **E2E Tests**: `tests/e2e/meetings/meetings-authz.spec.ts`

---

## 2. Fitur & Penegakan Keamanan (Security Enforcement)

### A. Tiga Tingkat Kerahasiaan (Visibility Levels)
Setiap rapat memiliki klasifikasi `visibility`:
1. `public`: Dapat dibaca oleh seluruh warga di aplikasi dan portal publik.
2. `internal`: Hanya dapat dibaca oleh warga terdaftar yang telah login.
3. `confidential`: **Hanya dapat diakses oleh Admin RT**. Warga non-admin yang mencoba memanggil API `GET /api/v1/meetings/{id}` dengan visibility confidential akan menerima **HTTP 403 Forbidden**. Action items dari rapat confidential juga disembunyikan dari warga biasa.

### B. Siklus Rapat & Rencana Tindak Lanjut
- Rapat memiliki status: `scheduled` -> `ongoing` -> `completed` -> `cancelled`.
- Setiap action item memiliki penanggung jawab (`pic_name`), tenggat waktu (`due_date`), dan status (`pending`, `in_progress`, `completed`).

---

## 3. Hubungan Lintas Dokumen

- [[01-architecture/authentication-and-rbac|Penegakan RBAC Rapat Confidential]]
- [[02-modules/portal-transparansi-publik|Rapat Publik di Portal Warga]]
- [[00-MOC|Kembali ke MOC]]
