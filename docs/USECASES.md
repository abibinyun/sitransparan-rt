# Spesifikasi Use Cases Berdasarkan Peran (Role-Based Use Cases)

Aplikasi **Sitransparan RT** berbasis Multi-Tenancy di mana setiap pengguna terdaftar adalah bagian dari komunitas/warga RT (Tenant).

---

## 1. Role: Public (Unauthenticated User)
Pengguna umum yang mengakses portal transparansi publik tanpa perlu login.

### Use Cases:
- **UC-PUB-01: Lihat Pengumuman & Dokumen Publik**
  - Mengakses rute `/public/announcements`
  - Membaca daftar pengumuman RT dan mengunduh/melihat dokumen publik.
- **UC-PUB-02: Lihat Aspirasi & Kebutuhan Warga Publik**
  - Mengakses rute `/public/aspirations`
  - Membaca daftar aspirasi warga dan daftar kebutuhan lingkungan RT.
- **UC-PUB-03: Lihat Agenda & Kegiatan RT Publik**
  - Mengakses rute `/public/events`
  - Membaca kalender kegiatan dan jadwal acara RT.

---

## 2. Role: Resident (Warga RT)
Warga terdaftar yang terikat pada suatu tenant RT. Memiliki akses internal untuk partisipasi warga.

### Use Cases:
- **UC-RES-01: Autentikasi & Pemilihan Tenant**
  - Login dengan email & password terdaftar.
  - Memilih tenant RT yang diikuti.
- **UC-RES-02: Lihat Dashboard Warga**
  - Membaca ringkasan iuran pribadi, kegiatan mendatang, dan pengumuman terbaru.
- **UC-RES-03: Kirim Aspirasi & Kebutuhan**
  - Mengajukan aspirasi atau saran baru kepada pengurus RT.
- **UC-RES-04: Pembayaran Iuran & Riwayat**
  - Mengajukan bukti pembayaran iuran bulanan warga.
- **UC-RES-05: Konfirmasi Kehadiran (RSVP) Kegiatan**
  - Mengonfirmasi rsvp hadir / tidak hadir pada acara RT.

---

## 3. Role: Admin RT (Pengurus RT)
Pengurus RT yang mengelola operasional internal tenant RT (Warga, Keuangan, Kegiatan, Pengumuman, dan Pengguna RT).

### Use Cases:
- **UC-ADM-01: Manajemen Pengguna RT (CRUD User)**
  - Mengakses rute `/users`.
  - **Create**: Menambahkan warga / pengurus RT baru.
  - **Read**: Melihat daftar pengguna beserta nomor kontak dan perannya.
  - **Update**: Mengubah nama, email, phone, role, dan password pengguna.
  - **Delete**: Menghapus akses pengguna dari tenant RT.
- **UC-ADM-02: Manajemen Pendataan Warga (CRUD Resident)**
  - Mengakses rute `/residents`.
  - Mengelola data demografi warga, KK, status kependudukan, dan anggota keluarga.
- **UC-ADM-03: Manajemen Keuangan & Pembukuan Kas RT**
  - Mengakses rute `/financial`.
  - Verifikasi pembayaran iuran warga (Approve / Reject).
  - Pencatatan transaksi pemasukan & pengeluaran kas RT.
- **UC-ADM-04: Kelola Kegiatan & Penganggaran (Events & Budgeting)**
  - Mengakses rute `/events`.
  - Membuat acara baru, mengatur anggaran biaya, dan memantau partisipasi warga.
- **UC-ADM-05: Kelola Pengumuman & Dokumen Resmi**
  - Mengakses rute `/announcements`.
  - Menerbitkan pengumuman resmi RT & upload file dokumen.

---

## 4. Role: Super Admin (Pengelola Platform)
Pengelola platform utama yang memiliki hak akses tertinggi ke seluruh tenant dan pengguna sistem.

### Use Cases:
- **UC-SUP-01: Manajemen Tenant RT (CRUD Tenant)**
  - Mengakses rute `/superadmin/tenants`.
  - Mendaftarkan RT/RW baru ke dalam platform.
  - Mengedit informasi tenant (nama, domain, slug, logo).
  - Menonaktifkan atau menghapus tenant.
- **UC-SUP-02: Akses Lintas Tenant & Pengguna (Cross-Tenant Admin)**
  - Mengelola seluruh pengguna dari semua tenant RT.
  - Mengatur peranan (SuperAdmin, Admin RT, Resident).
