# Spesifikasi & Arsitektur Domain, Multi-Tenancy, dan Tata Kelola Pengguna
**Sitransparan RT/RW SaaS Platform**

Dokumen ini menjadi acuan kanonik untuk tata letak domain (Root vs Subdomain), batasan hierarki pengguna (*SuperAdmin*, *Admin RT*, *Warga*), alur registrasi, serta isolasi data antar-tenant.

---

## 1. Arsitektur Domain: Root Platform vs Subdomain Tenant

Pemisahan konten dan fungsionalitas berdasarkan host request:

```text
Hostname Request
├── Root Platform Domain (openrt.local / sitransparan.com / localhost)
│   ├── /                 → Landing Page Platform SaaS (Pengenalan, Fitur, Direktori RT, Ajakan Buat RT)
│   ├── /tentang          → Informasi & Legalitas Platform
│   ├── /daftar-rt        → Form Pengajuan / Pendaftaran RT Baru
│   └── /login            → Pintu Masuk Pengguna Platform & SuperAdmin
│
└── Tenant Subdomain / Custom Domain (rt-003.openrt.local / rt01.perumahan.com)
    ├── /                 → Portal Transparansi RT (Kabar, Ringkasan Kas, Polling, Notulen Terbuka)
    ├── /usulan           → Aspirasi Warga & Kebutuhan Komunitas RT Tersebut
    ├── /agenda           → Jadwal & Agenda Kegiatan RT Tersebut
    ├── /login            → Masuk Akun Warga / Pengurus RT Tersebut
    └── /admin/*          → Panel Pengurus RT Tersebut (Khusus Role Admin RT)
```

### Matriks Perilaku Domain

| Fitur / Halaman | Root Platform Domain | Tenant Subdomain (`<slug>.<baseDomain>`) |
|---|---|---|
| **Beranda (`/`)** | **Landing Page SaaS Global** (Produk, Direktori RT, Cara Kerja) | **Portal Transparansi RT** (Timeline kabar, saldo kas terbuka, kegiatan) |
| **Data yang Ditampilkan** | Statistik global / Publikasi Platform | **100% Terisolasi** hanya data RT yang bersangkutan |
| **Form Registrasi** | Pendaftaran Akun Global / Pengajuan RT Baru | Registrasi Warga Terkait (otomatis terikat antrean verifikasi RT tersebut) |
| **Akses Admin (`/admin/*`)** | Panel SuperAdmin (Platform Management) | Panel Pengurus RT (Operasional RT tersebut) |

---

## 2. Hierarki dan Batasan Peran Pengguna (Role & Boundaries)

Pemisahan tanggung jawab secara ketat (*Separation of Concerns*):

```text
                    ┌─────────────────────────┐
                    │       SUPER ADMIN       │ (Platform Owner)
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌──────────────────────┐                   ┌──────────────────────┐
│     TENANT RT 003    │                   │     TENANT RT 004    │
│  ┌────────────────┐  │                   │  ┌────────────────┐  │
│  │    ADMIN RT    │  │                   │  │    ADMIN RT    │  │
│  └────────┬───────┘  │                   │  └────────┬───────┘  │
│           │          │                   │           │          │
│     ┌─────┴─────┐    │                   │     ┌─────┴─────┐    │
│     ▼           ▼    │                   │     ▼           ▼    │
│ [Warga A]   [Warga B]│                   │ [Warga X]   [Warga Y]│
└──────────────────────┘                   └──────────────────────┘
```

### A. Super Admin (Platform Owner)
- **Fokus**: Menjaga ketersediaan SaaS, pendaftaran tenant RT baru, dan penunjukan penanggung jawab RT.
- **Kewenangan**:
  - Mendaftarkan Tenant RT baru (`tenants`).
  - Mengelola lifecycle tenant (Aktifkan / Nonaktifkan / Hapus Tenant).
  - Mengatur domain tenant (Subdomain otomatis atau Custom Domain).
  - Membuatkan akun awal dan menunjuk **Admin RT (Ketua/Pengurus Utama)** untuk tenant tersebut.
  - Memantau metrik agregat kesehatan platform (jumlah tenant, traffic, audit log sistem).
- **Batasan Ketat (Yang DILARANG)**:
  - **TIDAK BOLEH** mengelola, mengedit, atau menginput data warga lokal RT (`residents`).
  - **TIDAK BOLEH** mengintervensi transaksi kas harian, iuran warga, notulen rapat RT, atau data privat internal RT.

---

### B. Admin RT (Tenant Admin)
- **Fokus**: Mengelola administrasi dan operasional lingkungan RT-nya sendiri.
- **Kewenangan**:
  - Mengelola data kependudukan RT (`residents`), kartu keluarga, dan verifikasi NIK.
  - Menyetujui pendaftaran warga (*resident approval workflow*).
  - Mengundang / menautkan akun pengguna (`users`) ke data warga (`residents`).
  - Mengangkat pengurus internal tambahan di RT-nya (contoh: Bendahara / Sekretaris dengan role `admin_rt`).
  - Mencatat arus kas, mengelola pos anggaran, kategori iuran, dan memverifikasi bukti bayar warga.
  - Membuat notulen rapat, agenda kegiatan, pengumuman (publik vs warga saja), dan merespon aspirasi.
- **Batasan Ketat (Yang DILARANG)**:
  - **TIDAK BISA** melihat, mengubah, atau mengakses data RT lain (terisolasi skema database).
  - **TIDAK BISA** mengangkat dirinya sendiri atau orang lain menjadi `superadmin`.
  - **TIDAK BISA** membuat atau menghapus tenant RT.

---

### C. Warga (Resident)
- **Fokus**: Transparansi, partisipasi warga, dan pembayaran iuran.
- **Kewenangan**:
  - Mengakses portal internal RT tempat ia terdaftar.
  - Membaca pengumuman internal (`target = 'residents_only'`) dan notulen rapat warga.
  - Melihat riwayat pembayaran iuran pribadi dan mengunggah bukti bayar.
  - Mengikuti polling suara warga dan musyawarah.
  - Mengirim aspirasi / usulan ke pengurus RT.
- **Batasan**:
  - Hanya memiliki akses baca data privat miliknya sendiri dan data publik RT-nya.
  - Tidak memiliki akses ke panel `/admin/*`.

---

### D. Publik (Anonim / Tamu Tanpa Login)
- **Fokus**: Keterbukaan informasi dasar lingkungan.
- **Kewenangan**:
  - Melihat timeline pengumuman umum (`target = 'all'`) di subdomain RT.
  - Melihat agregat kas terbuka RT (total saldo dan ringkasan kas masuk/keluar, tanpa membuka privasi data pribadi warga).
  - Melihat agenda kegiatan umum dan mengisi polling terbuka.
  - Mengirim aspirasi / keluhan anonim.
- **Batasan**:
  - Tidak dapat melihat detail dokumen bertanda `residents_only` atau rapat bertanda `confidential`.
  - Tidak dapat mengakses fitur manajemen apa pun.

---

## 3. Tata Kelola Pengguna: User vs Resident vs Membership

Model data memisahkan secara bersih tiga entitas:

```text
1. Akun Login (public.users)
   ├── id, email, password_hash, name, phone
   └── Bersifat global di platform.

2. Hubungan Keanggotaan (public.tenant_users)
   ├── id, user_id, tenant_id, role_id, status (active/inactive)
   └── Menentukan di RT mana user ini terdaftar dan sebagai apa.

3. Data Kependudukan (tenant_<slug>.residents)
   ├── id, nik (terenkripsi AES-256-GCM), nik_hash (HMAC blind index), full_name, no_kk, address
   ├── user_id (NULLABLE — relasi opsional ke public.users)
   └── Warga bisa terdata di RT tanpa harus memiliki akun login (anak-anak, lansia).
```

### Aturan Relasi Akun dan Warga:
1. **Warga Tanpa Akun**: Admin RT mendata kependudukan secara manual. Field `user_id` bernilai `NULL`.
2. **Warga Berakun**: Ketika warga mendaftar atau diundang, Admin RT melakukan penautan (*linking*) akun `users` ke data `residents` yang bersangkutan.
3. **Multi-Tenant Membership**: Seorang pengguna dapat menjadi `admin_rt` di RT-003, sekaligus menjadi `resident` biasa di RT-004. Konteks berpindah menggunakan fitur *Switch Tenant* yang menerbitkan JWT terverifikasi server.

---

## 4. Alur Lifecycle & Onboarding

### A. Alur Pembuatan RT Baru (Tenant Provisioning)
```text
[Pemohon / Calon Ketua RT]
         │ Mengajukan pendaftaran RT di root domain
         ▼
[Super Admin]
         │ Memverifikasi pengajuan & membuat Tenant di /admin/tenants
         ├─ 1. Generate Schema Database: tenant_<slug>
         ├─ 2. Buat record di public.tenants
         ├─ 3. Buat akun Admin RT di public.users
         └─ 4. Pasang mapping di public.tenant_users (role: admin_rt)
         ▼
[Admin RT]
         │ Menerima kredensial & login di <slug>.openrt.local/admin
         └─ Mulai mengelola data RT secara mandiri
```

### B. Alur Pendaftaran Warga (Resident Onboarding)
```text
[Warga Baru]
         │ Buka http://rt-003.openrt.local:3000/login (mode Daftar)
         ▼
[Backend]
         │ 1. Buat akun di public.users
         │ 2. Buat status pending di tenant_users (tenant_id = RT 003)
         ▼
[Admin RT 003]
         │ Buka /admin/residents → Verifikasi & Setujui (Approve)
         │ Tautkan dengan data NIK / KK warga di database RT
         ▼
[Warga]
         │ Akun aktif sebagai role 'resident' di RT 003
```

---

## 5. Ringkasan Matriks Hak Akses Antar-Peran

| Aksi & Modul | Publik | Warga (Resident) | Admin RT | Super Admin |
|---|:---:|:---:|:---:|:---:|
| **Landing Page Platform (`/` di Root)** | Ya | Ya | Ya | Ya |
| **Portal Transparansi RT (`/` di Subdomain)** | Ya | Ya | Ya | Ya |
| **Kirim Aspirasi Anonim** | Ya | Ya | Ya | Ya |
| **Lihat Pengumuman & Dokumen Internal** | ❌ | Ya | Ya | Ya |
| **Lihat Rapat Rahasia (*Confidential Meetings*)** | ❌ | ❌ | Ya | Ya |
| **Kelola Warga, NIK & Anggota Keluarga** | ❌ | ❌ | **Ya (RT-nya)** | ❌ |
| **Catat Arus Kas & Verifikasi Iuran** | ❌ | ❌ | **Ya (RT-nya)** | ❌ |
| **Kelola Kegiatan, RAB & Sponsor** | ❌ | ❌ | **Ya (RT-nya)** | ❌ |
| **Undang / Tautkan Warga ke Akun** | ❌ | ❌ | **Ya (RT-nya)** | ❌ |
| **Tunjuk Admin RT Utama** | ❌ | ❌ | ❌ | **Ya** |
| **Buat / Nonaktifkan / Hapus Tenant RT** | ❌ | ❌ | ❌ | **Ya** |
| **Kelola Role `superadmin`** | ❌ | ❌ | ❌ | **Ya** |

---

## 6. Daftar Analisis & Poin Perhatian (Checklist Implementasi)

- [ ] **Frontend Root Routing**: Deteksi host di frontend. Jika di platform host (`openrt.local`, `localhost`, `app.openrt.local`), rute `/` merender **Landing Page Platform**, bukan portal transparansi salah satu tenant.
- [ ] **Subdomain Portal Routing**: Jika di subdomain tenant (`rt-003.openrt.local`), rute `/` merender **Portal Transparansi RT 003**.
- [ ] **Penyaringan Menu SuperAdmin**: Menu kependudukan warga (`/admin/residents`), kas internal (`/admin/financial`), dan rapat RT disembunyikan/dibatasi dari SuperAdmin agar SuperAdmin fokus pada manajemen tenant dan Admin RT.
- [ ] **Onboarding Warga Berbasis Hostname**: Form pendaftaran yang diakses di subdomain `rt-003.openrt.local` secara otomatis meregistrasikan permintaan membership ke tenant RT-003.
- [ ] **Isolasi Agregat Kas Publik**: Pastikan data kas di portal publik hanya agregat per pos dana/kategori tanpa memunculkan daftar penunggak atau data identitas personal warga.
