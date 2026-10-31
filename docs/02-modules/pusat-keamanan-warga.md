---
title: "Modul Pusat Keamanan Warga"
tags:
  - module
  - safety
  - emergency
  - siskamling
---

# 🚨 Modul Pusat Keamanan Warga

Dokumentasi fitur keselamatan warga lingkungan: Tombol Darurat (Panic Button), Penanganan Panggilan Darurat, dan Laporan Rumah Kosong / Mudik Rahasia.

## 1. Pemetaan Arsitektur Kode Sumber

```text
backend/
├── internal/domain/safety.go                  # Entitas EmergencyAlert, HouseVacancy
├── internal/repository/safety_repository.go    # Query schema-qualified tenant_<slug>.emergency_alerts & house_vacancies
├── internal/usecase/safety_usecase.go          # Trigger alarm, notifikasi broadcast, proteksi data rahasia
└── internal/delivery/http/safety_handler.go    # Endpoint REST /api/v1/safety/...
frontend/
├── src/services/safety.ts                     # TanStack Query mutation & queries
├── src/components/safety/PanicButtonWidget.tsx # Widget tombol darurat & banner alarm aktif
├── src/components/safety/HouseVacancyModal.tsx# Dialog form pelaporan rumah kosong / mudik
└── src/pages/ResidentDashboardView.tsx        # Integrasi tombol darurat di dasbor warga
```

## 2. Fitur & Penegakan Keamanan (Security Enforcement)

### A. Tombol Alarm Darurat (Panic Button)
Warga dapat memicu alarm darurat seketika dengan 4 jenis kategori:
- `medical`: Darurat medis / permintaan ambulans
- `fire`: Kebakaran
- `crime`: Kejahatan, maling, atau orang mencurigakan
- `other`: Bencana alam atau darurat lingkungan lainnya

Saat dipicu, backend usecase secara simultan:
1. Menyimpan alert ke tabel `emergency_alerts` dengan status `active`.
2. Mengirimkan in-app notification bertanda `category = 'emergency'` dan prioritas darurat ke seluruh pengurus RT.
3. Menyiarkan sinyal alarm ke seluruh warga lingkungan via Web Push notification.
4. Pengurus RT / operator siskamling dapat menandai alarm `resolved` setelah penanganan lapangan tuntas.

### B. Laporan Rumah Mudik / Kosong Rahasia (`house_vacancies`)
Warga yang bepergian mudik atau meninggalkan rumah kosong dapat mendaftarkan jadwal kepergian dan nomor kontak darurat yang bisa dihubungi:
- **Prinsip Kerahasiaan Tingkat Tinggi (Confidential)**: Data rumah kosong dijaga ketat di tingkat usecase dan handler. Warga biasa hanya diizinkan melihat laporannya sendiri (`house_id` milik warga yang login).
- Akses ke seluruh rekap rumah kosong lingkungan hanya diizinkan bagi pengurus RT (`admin_rt`, `superadmin`, `operator`). Akses oleh peran tidak berhak akan ditolak tegas dengan kode HTTP `403 Forbidden` untuk mencegah penyalahgunaan informasi rumah kosong oleh pihak luar.

## 3. Hubungan Lintas Dokumen
- [[00-MOC|Peta Dokumen Utama (MOC)]]
- [[03-database/schema-inventory|Skema Basis Data]] (Tabel `emergency_alerts`, `house_vacancies`)
- [[02-modules/pusat-notifikasi-inbox|Modul Pusat Notifikasi Inbox]] (Pemberitahuan darurat otomatis)
- [[02-modules/notifikasi-webpush|Modul Notifikasi Web Push & Alert]]
- [[03-api/api-inventory|Katalog Endpoint API]]
