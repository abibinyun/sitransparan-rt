---
title: "Modul Pusat Notifikasi Inbox"
tags:
  - module
  - notification
  - inbox
  - push
---

# 📥 Modul Pusat Notifikasi Inbox

Dokumentasi pusat kotak masuk pemberitahuan (in-app notification center) untuk menyajikan kabar iuran, kegiatan, rapat, darurat, dan mention diskusi secara terpadu.

## 1. Pemetaan Arsitektur Kode Sumber

```text
backend/
├── internal/domain/notification.go            # Entitas InAppNotification & NotificationRepository interface
├── internal/repository/notification_repository.go # Query schema-qualified tenant_<slug>.in_app_notifications
├── internal/usecase/notification_usecase.go   # Dispatcher ganda: simpan DB + trigger VAPID Web Push
└── internal/delivery/http/notification_handler.go # Endpoint REST /api/v1/notifications/...
frontend/
├── src/services/notification.ts               # TanStack Query mutation & queries (/notifications)
├── src/components/notifications/NotificationBell.tsx # Icon lonceng dengan unread count badge & polling
├── src/components/notifications/NotificationInboxModal.tsx # Dialog daftar notifikasi & mark as read
└── src/components/MainLayout.tsx              # Integrasi bell notifikasi di header navigasi
```

## 2. Fitur & Mekanisme Pengiriman

### A. Pola Dual-Dispatch (Database + Web Push)
Saat sebuah event terjadi di aplikasi (misalnya verifikasi iuran, pemicuan panic button, atau komentar di postingan):
1. **Penyimpanan Database In-App**: Record notifikasi dituliskan ke tabel `tenant_<slug>.in_app_notifications` yang dihubungkan dengan `user_id` penerima (atau `user_id IS NULL` untuk pengumuman publik seluruh warga).
2. **Penyaluran Web Push (VAPID)**: Secara paralel, sistem memicu pengiriman notifikasi OS (browser background push) melalui layanan Web Push VAPID, sehingga warga tetap mendapatkan notifikasi meskipun browser sedang tidak aktif membuka aplikasi.

### B. Kotak Masuk & Manajemen Status Dibaca
- **Indikator Unread Lonceng**: Header aplikasi secara berkala memantau `GET /api/v1/notifications/unread-count`. Jika ada notifikasi baru, lonceng menampilkan badge merah dengan jumlah notifikasi belum dibaca.
- **Tandai Semua Dibaca (`read-all`)**: Warga dapat mengeklik tombol "Tandai semua dibaca" (`POST /api/v1/notifications/read-all`) untuk mengosongkan status belum dibaca dalam satu klik.
- **Navigasi Otomatis (`action_url`)**: Setiap notifikasi dapat memuat `action_url` (contoh: `/community`, `/admin/financial`). Saat diklik di inbox modal, notifikasi otomatis ditandai terbaca dan pengguna diarahkan langsung ke halaman terkait.

## 3. Hubungan Lintas Dokumen
- [[00-MOC|Peta Dokumen Utama (MOC)]]
- [[03-database/schema-inventory|Skema Basis Data]] (Tabel `in_app_notifications`)
- [[02-modules/notifikasi-webpush|Modul Notifikasi Web Push & Alert]]
- [[02-modules/pusat-keamanan-warga|Modul Pusat Keamanan Warga]]
- [[02-modules/ruang-warga-and-marketplace|Modul Ruang Warga & Lapak UMKM]]
- [[03-api/api-inventory|Katalog Endpoint API]]
