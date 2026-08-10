# Panduan Pengujian Manual & Skenario Uji (Manual Testing Guide)

Dokumen ini berisi panduan skenario pengujian manual komprehensif untuk aplikasi **Sitransparan RT**.

---

## 1. Aturan Dasar & Informasi Akses

### Prinsip Utama Sistem (Tenant Mandatory & Multi-Tenancy)
1. **Asosiasi Tenant Wajib**: Setiap akun terdaftar (Warga/Resident, Admin RT, dan SuperAdmin) wajib terafiliasi dengan Tenant RT tempat warga/pengurus tersebut berada.
2. **Isolasi Data (Tenant Isolation)**: Admin RT hanya dapat melihat dan mengelola data warga, keuangan, kegiatan, dan pengumuman di lingkungan RT (tenant) mereka sendiri.
3. **SuperAdmin Scope**: SuperAdmin memiliki akses platform-wide untuk pendaftaran RT (tenant) baru dan manajemen pengguna lintas tenant.

---

### Kredensial Pengujian (Default Seed Data)

| Role / Peran | Email | Password | Lingkup Tenant (RT/RW) |
|---|---|---|---|
| **SuperAdmin** | `superadmin@platform.local` | `admin123` | Lintas Platform / Seluruh Tenant |
| **Admin RT** | `admin_test@test.local` | `Password123!` | RT 05 RW 03 (Tenant Default) |
| **Resident (Warga)** | Registrasi Mandiri di `/login` | Sesuai pendaftaran | RT 05 RW 03 |
| **Public** | *Tanpa Login* | N/A | Portal Transparansi Publik |

---

## 2. Matriks Pengujian Fitur & Role

| Modul Fitur | Public | Resident | Admin RT | SuperAdmin |
|---|:---:|:---:|:---:|:---:|
| **Public Portal (Pengumuman, Aspirasi, Agenda)** | ✅ | ✅ | ✅ | ✅ |
| **Autentikasi (Login & Register Warga)** | ✅ | ✅ | ✅ | ✅ |
| **Dashboard RT & Analytics (Export CSV/PDF)** | ❌ | ✅ | ✅ | ✅ |
| **Pendataan Warga & KK (`/residents`)** | ❌ | 👁️ (Self) | ✅ | ✅ |
| **Keuangan Kas & Iuran (`/financial`)** | ❌ | 💳 (Bayar) | ✅ (Verifikasi & Catat) | ✅ |
| **Kegiatan & Penganggaran (`/events`)** | ❌ | 📅 (RSVP) | ✅ (Kelola & Budget) | ✅ |
| **Aspirasi & Kebutuhan (`/aspirations`)** | ❌ | 📝 (Kirim) | ✅ (Respon & Kelola) | ✅ |
| **Pengumuman & Dokumen (`/announcements`)** | ❌ | 👁️ | ✅ (Kelola & Upload) | ✅ |
| **Manajemen Pengguna RT (`/users`)** | ❌ | ❌ | ✅ (Level Tenant) | ✅ |
| **Manajemen Tenant RT (`/superadmin/tenants`)** | ❌ | ❌ | ❌ | ✅ |

---

## 3. Skenario Pengujian Manual Terperinci

---

### M-01: Modul Portal Publik (Public / Tanpa Login)

#### Test Case 1.1: Akses Pengumuman & Dokumen Publik
- **URL**: `http://localhost:3000/public/announcements`
- **Langkah-langkah**:
  1. Buka browser tanpa login.
  2. Buka URL `/public/announcements`.
  3. Amati bagian Banner Header *Keterbukaan Informasi Warga RT*.
  4. Ketik kata kunci pada kotak pencarian (misal: `Gotong Royong` atau `Notulen`).
  5. Coba klik tautan lampiran dokumen untuk mengunduh.
- **Hasil yang Diharapkan**:
  - Halaman memuat tanpa error HTTP 404/500.
  - Hasil pencarian menyaring daftar pengumuman dan dokumen secara aktual.
  - Dokumen publik dapat diunduh/dibuka.

#### Test Case 1.2: Akses & Kirim Aspirasi Publik
- **URL**: `http://localhost:3000/public/aspirations`
- **Langkah-langkah**:
  1. Buka URL `/public/aspirations`.
  2. Berpindah antara tab **Daftar Aspirasi Publik** dan **Program Kebutuhan & Fasilitas RT**.
  3. Klik tombol `+ Sampaikan Aspirasi Warga`.
  4. Isi form modal:
     - Judul: `Perbaikan Penerangan Jalan RT 05`
     - Kategori: `Infrastruktur`
     - Isi Aspirasi: `Lampu jalan gang 3 mati sejak minggu lalu.`
  5. Klik tombol **Kirim Aspirasi**.
- **Hasil yang Diharapkan**:
  - Modal tertutup dan pesan sukses muncul.
  - Aspirasi baru langsung tampil di daftar aspirasi publik dengan status `Draft/Submitted`.

#### Test Case 1.3: Akses Agenda Kegiatan Publik
- **URL**: `http://localhost:3000/public/events`
- **Langkah-langkah**:
  1. Buka URL `/public/events`.
  2. Amati daftar kegiatan kebersamaan RT yang akan datang (Posyandu, Kerja Bakti, Musyawarah).
- **Hasil yang Diharapkan**:
  - Kartu agenda kegiatan tampil rapi beserta tanggal, waktu, lokasi, dan deskripsi.

---

### M-02: Modul Autentikasi & Registrasi Warga (Auth)

#### Test Case 2.1: Registrasi Mandiri Warga Baru (Assigned to Tenant)
- **URL**: `http://localhost:3000/login`
- **Langkah-langkah**:
  1. Buka halaman `/login` → Klik tombol **Daftar**.
  2. Isi form pendaftaran:
     - Nama Lengkap: `Budi Warga RT`
     - Email: `budi_warga@test.local`
     - Kata Sandi: `Password123!`
  3. Klik **Daftar Akun**.
- **Hasil yang Diharapkan**:
  - Akun berhasil dibuat di database.
  - User secara otomatis mendapatkan relasi tenant RT dan peran default `Resident`.
  - Aplikasi mengarahkan pengguna ke form login.

#### Test Case 2.2: Login & Logout Pengguna
- **URL**: `http://localhost:3000/login`
- **Langkah-langkah**:
  1. Masukkan Email `budi_warga@test.local` dan Kata Sandi `Password123!`.
  2. Klik **Masuk Akun**.
  3. Setelah masuk, amati nama pengguna & badge tenant di bagian header/sidebar.
  4. Klik menu / tombol **Keluar (Logout)**.
- **Hasil yang Diharapkan**:
  - Login berhasil, token disimpan, dan halaman dialihkan ke Dashboard `/`.
  - Setelah logout, session dihapus dan pengguna kembali ke `/login`.

---

### M-03: Modul Dashboard & Analytics (Dashboard)

#### Test Case 3.1: Ringkasan Kas & Statistik RT
- **URL**: `http://localhost:3000/`
- **Langkah-langkah**:
  1. Login sebagai Admin RT (`admin_test@test.local`).
  2. Amati card indikator utama: Total Warga, Total Pemasukan, Total Pengeluaran, Saldo Kas RT.
  3. Amati grafik/chart perbandingan Pemasukan vs Pengeluaran.
- **Hasil yang Diharapkan**:
  - Seluruh angka statistik memuat secara akurat sesuai data di database tenant.

#### Test Case 3.2: Export Laporan Keuangan (CSV & PDF)
- **URL**: `http://localhost:3000/`
- **Langkah-langkah**:
  1. Klik tombol **Export CSV** pada section Laporan Keuangan.
  2. Klik tombol **Export PDF**.
- **Hasil yang Diharapkan**:
  - File `.csv` dan `.pdf` berhasil terunduh ke komputer lokal tanpa error.

---

### M-04: Modul Pendataan Warga & Kartu Keluarga (`/residents`)

#### Test Case 4.1: Tambah & Edit Data Warga (CRUD Resident)
- **URL**: `http://localhost:3000/residents`
- **Langkah-langkah**:
  1. Login sebagai Admin RT.
  2. Klik tombol `+ Tambah Data Warga`.
  3. Isi data wajib: NIK, Nama Lengkap, No. KK, Alamat, No. HP, Status Kependudukan.
  4. Klik **Simpan**.
  5. Cari warga yang baru dibuat di kolom pencarian.
  6. Klik tombol **Edit** (icon pensil), ubah Nomor HP → Klik **Simpan**.
- **Hasil yang Diharapkan**:
  - Data warga tersimpan dan terasosiasi dengan tenant RT yang aktif.
  - Perubahan data langsung ter-update di tabel.

#### Test Case 4.2: Manajemen Anggota Keluarga (Family Members)
- **URL**: `http://localhost:3000/residents`
- **Langkah-langkah**:
  1. Klik baris warga Kepala Keluarga.
  2. Klik tombol `+ Tambah Anggota Keluarga`.
  3. Isi Nama Anggota, NIK, Hubungan (Istri/Anak), Tanggal Lahir → Simpan.
- **Hasil yang Diharapkan**:
  - Anggota keluarga baru muncul di bawah detail Kepala Keluarga.

---

### M-05: Modul Keuangan, Iuran & Kas RT (`/financial`)

#### Test Case 5.1: Verifikasi Ringkasan & Tab Keuangan
- **URL**: `http://localhost:3000/financial`
- **Langkah-langkah**:
  1. Buka halaman `/financial`.
  2. Verifikasi 3 Card Ringkasan: Total Masuk, Total Keluar, Saldo Kas RT.
  3. Berpindah antara Tab **Iuran Warga** dan **Transaksi Kas RT**.
- **Hasil yang Diharapkan**:
  - Ringkasan kas memuat angka tanpa error `404` atau `TypeError: map is not a function`.
  - Tabel iuran dan tabel transaksi memuat data dengan benar.

#### Test Case 5.2: Pencatatan & Verifikasi Iuran Warga
- **URL**: `http://localhost:3000/financial`
- **Langkah-langkah**:
  1. Klik tombol `+ Bayar / Catat Iuran`.
  2. Pilih Nama Warga, Pilih Kategori Iuran (misal: *Iuran Kebersihan & Keamanan*).
  3. Masukkan Bulan & Tahun Periode.
  4. Upload file bukti transfer (opsional) → Klik **Simpan**.
  5. Pada tabel Iuran Warga, klik tombol **Verifikasi (Approve)**.
- **Hasil yang Diharapkan**:
  - Pembayaran iuran tercatat dengan status `Pending`.
  - Setelah di-approve, status berubah menjadi `Verified` dan otomatis menambah Total Pemasukan Kas RT.

#### Test Case 5.3: Catat Transaksi Kas RT (Pemasukan / Pengeluaran)
- **URL**: `http://localhost:3000/financial`
- **Langkah-langkah**:
  1. Klik tombol `+ Transaksi Kas RT`.
  2. Pilih Jenis Transaksi: `Pengeluaran (Expense)`.
  3. Isi Kategori: `Pembelian Alat Kebersihan`, Jumlah: `150000`, Tanggal Transaksi, Deskripsi.
  4. Klik **Simpan Transaksi**.
- **Hasil yang Diharapkan**:
  - Transaksi pengeluaran baru tercatat di tab *Transaksi Kas RT*.
  - Saldo Kas RT otomatis berkurang sebesar Rp 150.000.

---

### M-06: Modul Kegiatan & Penganggaran (`/events`)

#### Test Case 6.1: Kelola Agenda Kegiatan & Budgeting
- **URL**: `http://localhost:3000/events`
- **Langkah-langkah**:
  1. Klik `+ Buat Kegiatan Baru`.
  2. Isi Judul Kegiatan (`Kerja Bakti HUT RI`), Tanggal, Lokasi, Deskripsi → Simpan.
  3. Klik tombol **Anggaran (Budget)** pada kartu kegiatan tersebut.
  4. Isi Rencana Anggaran Biaya (RAB) → Simpan.
- **Hasil yang Diharapkan**:
  - Kegiatan baru tampil di grid.
  - Alokasi anggaran kegiatan tersimpan dan dapat dipantau oleh pengurus.

#### Test Case 6.2: Konfirmasi Kehadiran (RSVP Warga)
- **URL**: `http://localhost:3000/events`
- **Langkah-langkah**:
  1. Klik tombol **RSVP Kehadiran** pada kegiatan aktif.
  2. Pilih status kehadiran (`Hadir` / `Tidak Hadir`) dan masukkan jumlah anggota keluarga.
- **Hasil yang Diharapkan**:
  - Jumlah partisipan kegiatan bertambah secara real-time.

---

### M-07: Modul Aspirasi & Kebutuhan Lingkungan (`/aspirations`)

#### Test Case 7.1: Tanggapan Pengurus RT atas Aspirasi
- **URL**: `http://localhost:3000/aspirations`
- **Langkah-langkah**:
  1. Login sebagai Admin RT.
  2. Buka tab **Aspirasi Warga**.
  3. Klik tombol **Tindak Lanjuti / Respon** pada salah satu aspirasi.
  4. Ubah status menjadi `In Progress` / `Resolved` dan tuliskan Catatan Pengurus.
  5. Klik **Simpan Response**.
- **Hasil yang Diharapkan**:
  - Status aspirasi terbarui dan tanggapan pengurus RT dapat dilihat oleh warga & publik.

---

### M-08: Modul Pengumuman & Dokumen RT (`/announcements`)

#### Test Case 8.1: Menerbitkan Pengumuman & Upload Surat Edaran
- **URL**: `http://localhost:3000/announcements`
- **Langkah-langkah**:
  1. Klik `+ Tambah Pengumuman`.
  2. Isi Judul (`Edaran Kerja Bakti`), Target (`ALL` / `KHUSUS WARGA`), Isi Pengumuman, dan attach file PDF edaran.
  3. Klik **Terbitkan**.
- **Hasil yang Diharapkan**:
  - Pengumuman resmi tersimpan di database tenant.
  - File ter-upload ke MinIO storage dan link dokumen berfungsi.

---

### M-09: Modul Manajemen Pengguna RT (`/users`)

#### Test Case 9.1: Full CRUD Manajemen Pengguna oleh Admin RT
- **URL**: `http://localhost:3000/users`
- **Langkah-langkah**:
  1. Login sebagai Admin RT (`admin_test@test.local`).
  2. **Create**: Klik `+ Tambah Pengguna` → Isi Nama (`Pengurus Sekretaris`), Email (`sekretaris@test.local`), No HP, Role (`Admin RT`), Password (`Password123!`) → Simpan.
  3. **Read**: Verifikasi pengguna tampil di tabel beserta role badge `RT_ADMIN`.
  4. **Update**: Klik icon Edit → Ubah No HP → Simpan → Verifikasi perubahan.
  5. **Delete**: Klik icon Delete → Konfirmasi Hapus → Verifikasi user terhapus dari tenant.
- **Hasil yang Diharapkan**:
  - Admin RT hanya bisa mengelola pengguna di tenant RT-nya sendiri.
  - Seluruh fungsi CRUD pengguna berjalan tanpa error.

---

### M-10: Modul SuperAdmin & Pendaftaran Tenant (`/superadmin/tenants`)

#### Test Case 10.1: Pendaftaran RT Baru (Tenant CRUD)
- **URL**: `http://localhost:3000/superadmin/tenants`
- **Langkah-langkah**:
  1. Login sebagai SuperAdmin (`superadmin@platform.local` / `admin123`).
  2. Buka rute `/superadmin/tenants`.
  3. Klik tombol `+ Pendaftaran RT Baru`.
  4. Isi Form Tenant:
     - Nama RT/RW: `RT 08 RW 04 Kelurahan Asri`
     - Domain / Slug: `rt08-rw04-asri`
  5. Klik **Simpan Tenant**.
- **Hasil yang Diharapkan**:
  - Tenant RT baru terdaftar di sistem.
  - SuperAdmin dapat mendaftarkan Admin RT pertama untuk tenant baru tersebut.

#### Test Case 10.2: Lintas Tenant User Management
- **URL**: `http://localhost:3000/users`
- **Langkah-langkah**:
  1. Login sebagai SuperAdmin → Buka `/users`.
  2. Amati daftar pengguna dari seluruh tenant RT yang terdaftar di platform.
- **Hasil yang Diharapkan**:
  - SuperAdmin memiliki visibilitas global atas seluruh pengguna di semua tenant RT.

---

## 4. Langkah Verifikasi Hasil & Troubleshooting

1. **Jalankan Automated E2E Regression Suite**:
   ```bash
   npx playwright test
   ```
   *Pastikan 24/24 test suite pass 100%.*

2. **Cek Log Service jika ada kendala HTTP**:
   ```bash
   docker compose -f infrastructure/docker-compose.yml logs -f backend
   ```
