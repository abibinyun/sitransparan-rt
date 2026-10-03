# Dokumentasi Implementasi Notifikasi (Web Push & PWA) — Sitransparan RT/RW

Dokumen ini menjelaskan arsitektur, alur data, konfigurasi, dan perbandingan implementasi notifikasi di proyek ini dengan spesifikasi blueprint di `IMPLEMEN_NOTIF.md`.

---

## 1. Masalah yang Terjadi Tadi (Root Cause)

Ketika admin membuat pengumuman baru, backend sebenarnya sudah memicu broadcast ke subscriber. Namun notifikasi gagal sampai ke HP karena:

1. **HTTP 403 Forbidden dari Endpoint FCM (Google Push Service)**
   - HP Android menggunakan FCM (`https://fcm.googleapis.com/...`).
   - FCM mewajibkan token otorisasi VAPID menyertakan klaim publik yang valid dan tanda tangan ECDSA P-256 yang lengkap.
   - Di `backend/internal/usecase/push_usecase.go`, saat memanggil `webpush.SendNotification(...)`, konfigurasi hanya menyertakan `VAPIDPrivateKey` dan `Subscriber`, sedangkan `VAPIDPublicKey` **belum disertakan**.
   - Tanpa `VAPIDPublicKey`, header VAPID tidak dapat diverifikasi secara penuh oleh FCM sehingga ditolak (403).

2. **Perbaikan yang Diterapkan**
   - Menambahkan `VAPIDPublicKey: u.cfg.VAPIDPublicKey` ke dalam parameter `webpush.Options`.
   - Menguji langsung kirim notifikasi ke subscriber token HP Anda: status seketika berubah dari **HTTP 403** menjadi **HTTP 201 Created**.
   - Menambahkan log pengiriman (status HTTP respon dan error) untuk mempermudah pemantauan.

---

## 2. Arsitektur & Alur Notifikasi di Proyek Ini

```text
  [ Perangkat Warga / HP ]
            │
            │ 1. Buka https://rt-003.iscube.web.id/kabar
            │ 2. Klik "Aktifkan di Perangkat Ini" (request Notification & PushManager)
            ▼
  [ Service Worker (frontend/src/sw.ts) ]
            │
            │ 3. Dapatkan endpoint, p256dh, auth via PushManager
            │ 4. POST /api/v1/push/subscribe (kirim tenant_slug & keys)
            ▼
  [ Backend (Go 1.25 API) ]
            │
            │ 5. Simpan ke tabel PostgreSQL: public.push_subscriptions
            │    (Terkait tenant_id = '3f78fa05-...' [RT 003] dan user_id jika login)
            ▼
  [ PostgreSQL 16 ]

  -------------------------------------------------------------
  [ Pemicu Notifikasi (Admin RT membuat pengumuman) ]
            │
            │ 1. POST /api/v1/announcements (Admin membuat pengumuman)
            │ 2. Handler simpan ke schema tenant_rt_003.announcements
            │ 3. Handler jalankan Goroutine async: pushUC.BroadcastTenant()
            ▼
  [ Push Usecase (push_usecase.go) ]
            │
            │ 4. Query semua subscriber di tenant tersebut (repo.ListByTenant)
            │ 5. Sign payload JSON dengan VAPID (Private Key + Public Key)
            │ 6. Kirim HTTP POST ke Push Gateway (FCM Google / Apple / Mozilla)
            ▼
  [ Push Service (Google FCM Server) ]
            │
            │ 7. Kirim data push melalui koneksi soket OS ke perangkat HP
            ▼
  [ HP Warga / PWA Service Worker ]
            │
            │ 8. Event 'push' terpanggil di background
            │ 9. self.registration.showNotification("Pengumuman Baru", { body, ... })
            │ 10. Muncul popup banner di status bar HP!
```

---

## 3. Komponen Teknis yang Terlibat

### 3.1 Frontend
- **`frontend/src/sw.ts`**:
  - Mendengarkan event `push` dan menampilkan banner notifikasi (`showNotification`).
  - Mendengarkan event `notificationclick` untuk membuka tautan `/kabar` saat notifikasi ditekan.
- **`frontend/src/services/push.ts`**:
  - `getPushConfig()`: mengambil kunci publik VAPID dari backend (`GET /api/v1/push/config`).
  - `enablePushNotifications()`: meminta izin notifikasi peramban, mengambil subscription dari browser PushManager, dan mendaftarkannya ke server (`POST /api/v1/push/subscribe`).
- **`frontend/src/pages/PublicAnnouncementsPage.tsx`**:
  - Menyediakan 1 tombol resmi untuk aktivasi notifikasi warga, status aktif, dan indikator error.

### 3.2 Backend
- **`backend/internal/delivery/http/push_handler.go`**:
  - Endpoint `GET /api/v1/push/config`: mengembalikan `{ enabled: true, public_key: "..." }`.
  - Endpoint `POST /api/v1/push/subscribe`: mencatat subscription perangkat.
- **`backend/internal/usecase/push_usecase.go`**:
  - Mengenkripsi payload dan menandatangani request dengan protokol RFC 8292 (VAPID) menggunakan pustaka `SherClockHolmes/webpush-go`.
  - Otomatis menghapus subscription yang sudah tidak aktif jika push service merespon 404/410 (unregistered).
- **`backend/internal/repository/push_repository.go`**:
  - `ListByTenant`: mencari subscriber yang merupakan anggota terdaftar di tenant aktif ataupun warga publik yang mendaftarkan subscription pada tenant tersebut.
- **`backend/internal/delivery/http/announcement_doc_handler.go`**:
  - Saat pengumuman berhasil disimpan, memicu broadcast asinkron di goroutine terpisah tanpa menghambat respon HTTP admin.

### 3.3 Database
- **Tabel `public.push_subscriptions`**:
  - Kolom: `id`, `user_id` (nullable), `tenant_id` (UUID tenant), `endpoint` (URL unik dari browser/FCM), `p256dh`, `auth`, `user_agent`, `created_at`.
  - `endpoint` unik (menggunakan `ON CONFLICT DO UPDATE` agar tidak ada data ganda per perangkat).

---

## 4. Perbandingan dengan `IMPLEMEN_NOTIF.md`

File `IMPLEMEN_NOTIF.md` adalah spesifikasi komprehensif skala enterprise/sistem besar. Berikut perbandingannya dengan apa yang ada di proyek kita:

| Aspek | Spesifikasi `IMPLEMEN_NOTIF.md` | Implementasi Proyek Saat Ini | Catatan / Kesesuaian |
|---|---|---|---|
| **Kanal Pengiriman** | Web Push (VAPID) | Web Push (VAPID) | **Sama**: menggunakan Web Push standar W3C & RFC 8292. |
| **Kunci VAPID** | Disimpan di Backend ENV | Disimpan di Backend ENV | **Sama**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. |
| **Queue / Asinkron** | Antrean Redis / Worker pool terpisah | Goroutine Go asinkron (`go func()`) dengan Context Timeout | **Sesuai kebutuhan**: proyek ini tidak mewajibkan Redis tambahan; Go goroutine cukup ringan untuk RT/RW tanpa overhead resource container. |
| **Multi-Tenancy** | Terisolasi per tenant/RT | Terisolasi per tenant schema & relasi `tenant_id` | **Sama**: notifikasi RT 003 hanya dikirim ke warga RT 003. |
| **Penerima Notifikasi** | Warga login & anonymous | Warga login & warga publik (portal subdomain) | **Sama**: mendukung user login maupun warga publik via token tenant. |
| **In-App Notification Center** | Bell icon dengan daftar notifikasi DB di pojok atas | Saat ini fokus pada Push OS banner + Feed Pengumuman | Notifikasi langsung muncul di HP. Daftar arsip in-app diwakili oleh feed pengumuman `/kabar`. |
| **Cleanup Endpoint Usang** | Auto-delete pada HTTP 404 / 410 | Auto-delete pada HTTP 404 / 410 | **Sama**: endpoint yang dicopot browser otomatis dibersihkan dari DB. |

---

## 5. Cara Menguji Kapan Saja
1. Buka `https://rt-003.iscube.web.id/kabar` di HP (Chrome / Samsung Internet / Safari iOS 16.4+).
2. Pastikan izin notifikasi aktif (tombol bertuliskan hijau "Notifikasi Aktif").
3. Buka dashboard admin di browser lain/laptop: `https://rt-003.iscube.web.id/admin/announcements`.
4. Klik **Buat Pengumuman Baru**, isi judul dan konten, lalu simpan.
5. Notifikasi akan langsung berdering/muncul di bar notifikasi HP Anda.
