---
title: "Modul Notifikasi Web Push & Alert"
description: "Pengiriman notifikasi instan berbasis standar W3C Push API / VAPID untuk pengumuman darurat dan pengingat iuran"
tags:
  - module
  - push-notifications
  - pwa
  - vapid
---

# 🔔 Modul Notifikasi Web Push & Alert

SiTransparan RT/RW mengimplementasikan push notifikasi native tanpa bergantung pada Firebase pihak ketiga, menggunakan standar **W3C Web Push API** dan otentikasi **VAPID (Voluntary Application Server Identification)**.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/push_subscription.go`
- **Database Tables**: `public.push_subscriptions` (disimpan terpusat dengan referensi `tenant_id` dan `user_id`)
- **Repository**: `backend/internal/repository/push_repository.go`
- **Usecase**: `backend/internal/usecase/push_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/push_handler.go`
  - `GET /api/v1/push/config` (mengembalikan Public VAPID Key)
  - `POST /api/v1/push/subscribe` (mendaftarkan token endpoint browser)
  - `POST /api/v1/push/unsubscribe`
- **Frontend Service Worker**: `frontend/src/sw.ts` (penanganan event `push` dan `notificationclick`)
- **Komponen UI**: Dialog izin notifikasi otomatis pada layout utama warga.

---

## 2. Fitur & Penanganan Broadcast

### A. Broadcast Tenant Aman
- Pengurus RT dapat mengirim notifikasi broadcast saat ada pengumuman darurat (misal: banjir, pemadaman listrik, jadwal fogging).
- Backend mengimplementasikan timeout aman (`context.WithTimeout(5 * time.Second)`) saat menghubungi push service (FCM, Apple Push Service, Mozilla) agar request admin tidak macet.

### B. Otentikasi & Penyimpanan Token
- Endpoint pendaftaran `POST /api/v1/push/subscribe` menggunakan axios terautentikasi (`api`), mencegah pendaftaran unauthorized token.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/kabar-and-documents|Pemicu Notifikasi dari Pengumuman]]
- [[07-frontend-design/bundle-and-performance|Konfigurasi Service Worker PWA]]
- [[00-MOC|Kembali ke MOC]]
