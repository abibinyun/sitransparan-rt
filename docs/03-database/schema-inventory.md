---
title: "Katalog Skema & Tabel Database"
description: "Daftar skema global (public) dan skema operasional (tenant_<slug>) beserta fungsi tiap tabel"
tags:
  - database
  - schema
  - postgresql
---

# 🗄️ Katalog Skema & Tabel Database

Basis data **SiTransparan RT/RW** berjalan di atas **PostgreSQL 16**. Struktur database dibagi menjadi 1 skema katalog global (`public`) dan banyak skema operasional (`tenant_<slug>`).

---

## 1. Skema Global (`public`)

Skema `public` menyimpan identitas global, pemetaan tenant, akun user, dan catatan audit lintas sistem:

| Tabel | Deskripsi |
|---|---|
| `tenants` | Master rukun tetangga/tenant: nama, slug, base domain, status (`active`/`inactive`), timestamp soft-delete |
| `users` | Akun pengguna global: email, hash kata sandi (bcrypt), nomor telepon terverifikasi, status aktif |
| `roles` | Kamus peran: `superadmin`, `admin_rt`, `resident` |
| `tenant_users` | Relasi many-to-many user ke tenant beserta role aktif (`user_id`, `tenant_id`, `role_id`, `status`) |
| `refresh_tokens` | Catatan sesi refresh token aktif (token_hash, user_id, expires_at, revoked_at) untuk rotasi dan pencabutan sesi |
| `audit_logs` | Buku audit log global mencatat seluruh mutasi data sensitif di seluruh tenant |
| `push_subscriptions` | Token endpoint push notification per browser/device pengguna |
| `portal_events` | Metrik analitik keterlibatan warga di portal transparansi publik (`feed_view`, `share_opened`) |

---

## 2. Skema Tenant (`tenant_<slug>`)

Setiap RT memiliki skema terisolasi dengan 27+ tabel operasional:

### A. Kependudukan & Rumah
- `residents`: Data pokok warga, nama, enkripsi NIK (`nik_encrypted`), blind index (`nik_hash`), status verifikasi.
- `family_members`: Anggota keluarga dalam 1 Kartu Keluarga (hubungan: istri, anak, famili lain).
- `houses`: Master nomor rumah, blok, RT/RW, dan status hunian.
- `house_residents`: Relasi warga yang menempati rumah tertentu.
- `house_qr_tokens`: Token unik rumah untuk keperluan scan QR kode.

### B. Keuangan & Kas RT
- `funds`: Kantong kas multi-rekening (Kas Utama, Kas Sosial, Kas Lapangan).
- `fee_categories`: Kategori iuran bulanan dan insidental.
- `dues_payments`: Pembayaran iuran warga (termasuk `payment_date`, bukti bayar, status verifikasi).
- `financial_transactions`: Buku besar mutasi kas RT (**append-only**).

### C. Bank Sampah Digital & Presensi Petugas
- `waste_categories`: Master jenis sampah, harga per kg, dan persentase bagi hasil warga.
- `waste_deposits`: Header transaksi setoran sampah warga.
- `waste_deposit_items`: Rincian berat (kg), nilai rupiah kotor, hak tabungan warga, dan hak kas pemuda.
- `waste_collectors`: Master data petugas/pemuda pengambil dan pemilah sampah.
- `waste_attendance`: Header kegiatan piket kerja bakti/penimbangan sampah lingkungan.
- `waste_attendance_members`: Daftar presensi petugas pada kegiatan bersangkutan beserta catatan honor/uang lelah yang dibayarkan.

### D. Struktur Kepengurusan & Karang Taruna
- `rt_periods`: Periode masa bakti pengurus RT (misal 2024–2027).
- `rt_members`: Susunan pengurus RT (Ketua, Sekretaris, Bendahara, Seksi).
- `karang_taruna_periods`: Periode masa bakti pemuda Karang Taruna.
- `karang_taruna_members`: Susunan pengurus Karang Taruna.
- `karang_taruna_configs`: Pengaturan dinamis seksi bidang (JSONB).

### E. Inventaris & Aset
- `inventory_items`: Master barang aset RT beserta jumlah total dan jumlah tersedia.
- `inventory_borrowings`: Catatan peminjaman dan pengembalian barang inventaris.

### F. Rapat & Musyawarah
- `meetings`: Header agenda pertemuan RT beserta klasifikasi `visibility` (`public`, `internal`, `confidential`).
- `meeting_attendees`: Daftar presensi kehadiran musyawarah.
- `meeting_decisions`: Butir-butir mufakat hasil musyawarah.
- `meeting_action_items`: Penugasan rencana aksi tindak lanjut beserta PIC dan deadline.

### G. Kabar, Dokumen, dan Aspirasi
- `announcements`: Pengumuman berita RT dengan dukungan array gambar/file dan batasan `residents_only`.
- `announcement_comments`: Diskusi komentar warga di bawah pengumuman.
- `documents`: Repositori berkas dokumen resmi RT.
- `aspirations`: Kotak saran warga (mendukung pelaporan anonim).
- `community_needs`: Daftar inventaris kebutuhan fasilitas lingkungan.

### H. Sosial & Jajak Pendapat
- `polls`: Header pertanyaan voting warga.
- `poll_options`: Pilihan jawaban (2 sampai 6 opsi).
- `poll_votes`: Suara warga (unique constraint 1 warga 1 suara).
- `reactions`: Reaksi interaktif warga terhadap konten kabar.

---

## 3. Hubungan Lintas Dokumen

- [[01-architecture/multi-tenancy|Arsitektur Isolasi Skema]]
- [[03-database/migrations-history|Histori Migrasi Database (000001–000050)]]
- [[03-database/data-integrity-rules|Aturan Integritas Data]]
- [[00-MOC|Kembali ke MOC]]
