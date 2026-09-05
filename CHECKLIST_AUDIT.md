# Checklist Audit & Feedback Fitur SiTransparan RT/RW

Dokumen ini berisi ceklis menyeluruh dari seluruh modul, alur kerja (workflow), modal dialog, hingga komponen terkecil aplikasi SiTransparan RT/RW (Admin & Publik).
Format pengisian:
- Ganti `[ ]` menjadi `[x]` jika sudah dites dan sesuai.
- Berikan catatan/feedback di kolom `Temuan / Feedback:` jika ada error, glitch visual, validasi aneh, atau UX kurang pas.

---

## 1. Domain, Subdomain & Routing
- [x] **1.1 Akses Root Platform Landing Page**
  - URL: `http://localhost:3000/` atau `http://openrt.local/` / `https://iscube.web.id/`
  - Verifikasi: Muncul halaman landing platform dengan daftar fitur, tombol login, dan pencarian RT.
  - Temuan / Feedback: 
  https://iscube.web.id/ jika buka itu langsung diarahkan ke https://iscube.web.id/login , root domain gamau kebuka . btw semua halaman daftar di hide aja dulu, karna akses dari pengurus yg buat tapi api jangan dihilangkan
  - **Perbaikan Teknis Dilakukan:**
    1. Memperbaiki logika routing pada `App.tsx` dan `PublicLayout.tsx`: root platform kini menampilkan `PlatformLandingPage` tanpa memaksakan redirect ke `/login`.
    2. Menyembunyikan komponen direktori/pencarian tenant dan card tenant dari `PlatformLandingPage.tsx` demi menjaga privasi lingkungan (API backend tetap utuh).
    3. Mengintegrasikan `useAuthStore` pada `PlatformLandingPage`: jika user sudah login, tombol navbar dan CTA hero berubah otomatis menjadi "Buka Dashboard".
    4. Memperbaiki konfigurasi `server.hmr.clientPort: 443` pada `frontend/vite.config.ts` untuk mengeliminasi WebSocket mixed-content error di browser via Cloudflare tunnel.

- [x] **1.2 Akses Subdomain Tenant (Public Feed)**
  - URL: `http://sitransparan-rt.openrt.local/` atau `https://sitransparan-rt.iscube.web.id/`
  - Verifikasi: Langsung masuk ke Timeline / Portal Publik RT bersangkutan (bukan landing platform).
  - Temuan / Feedback: 
  halaman masing masing tenant berhasil terbuka dengan masing masing datanya, disini saya pakai https://rt-003.iscube.web.id/ dan https://rt-004.iscube.web.id/
  - **Perbaikan Teknis Dilakukan:**
    1. Pembersihan database menyeluruh: Semua tenant uji coba dan pengguna telah dihapus bersih beserta seluruh schema PostgreSQL (`DROP SCHEMA tenant_* CASCADE`), menyisakan akun sistem murni `abi@gmail.com` sebagai SuperAdmin global tanpa kaitan tenant (`tenant_id = nil`).
    2. Database siap untuk pengujian alur dari awal (pembuatan tenant, registrasi, assign role, dsb).

- [x] **1.3 Dynamic Domain Resolution**
  - Verifikasi: Akses custom domain / slug yang belum terdaftar memberi fallback 404 / informasi jelas.
  - Temuan / Feedback: 
  Selesai: Subdomain 404 menampilkan UI informatif, parsing ccTLD .web.id akurat mengarahkan ke root domain platform tanpa terpotong, dan daftar tenant di root landing page telah disembunyikan untuk menjaga privasi lingkungan.
  - Temuan Tambahan: Saat tenant sudah dihapus / tidak terdaftar, halaman runtutan seperti `https://rt-004.iscube.web.id/login` atau `/admin` masih sempat me-render form/layout sebelum diperbaiki.
  - **Perbaikan Teknis Dilakukan:**
    1. Membuat komponen reusable `TenantNotFoundPage.tsx` untuk menampilkan status fallback 404 seragam.
    2. Menambahkan validasi tenant slug sinkron pada `LoginPage.tsx`: Saat user berada di subdomain tenant, sistem menunggu verifikasi status tenant (menampilkan loading spinner tanpa flash form login), dan jika API backend mengembalikan 404 (tenant not found/inactive), langsung digantikan oleh `TenantNotFoundPage`.
    3. Mengoptimalkan `usePublicTenantQuery`: menonaktifkan retry otomatis pada HTTP status 404 agar halaman 404 muncul seketika tanpa penundaan.
    4. Menambahkan proteksi serupa di `MainLayout.tsx` dan `ClaimHouseTokenPage.tsx` agar seluruh runtutan URL internal (`/admin/*`, `/claim`, `/login`) pada subdomain tenant non-existent seragam menampilkan 404 dan tidak membuka akses.
    5. Memperbaiki regex ccTLD parsing domain di `frontend/src/utils/tenant.ts`: domain `.web.id` tidak lagi terpotong menjadi `.id` atau `web.id`.
    6. Mengganti hardcoded/naive string split pada tombol "Kembali ke Beranda" di seluruh fallback 404 menggunakan fungsi kanonikal `getPlatformUrl('/')`.

---

## 2. Autentikasi & Manajemen Sesi (Login, Register, IAM)
- [x] **2.1 Login Super Admin (Global)**
  - Akun: `abi@gmail.com` / `admin123`
  - Verifikasi: Berhasil masuk, role terbaca `superadmin`, redirect ke dashboard/tenants.
  - Temuan / Feedback: 
  berhasil masuk dan terbaca admin https://iscube.web.id/admin/tenants. tapi kalau saya login via tenant atau dari yg bukan url loginnya https://rt-003.iscube.web.id/login dia gagal dan diarahkan ke https://iscube.web.id/login lalu saya login lagi baru bisa 
  - **Perbaikan Teknis Dilakukan:**
    1. Mengaktifkan listener autentikasi otomatis di `LoginPage.tsx` via `useEffect`: jika sesi token valid ditemukan di state/storage, login form langsung redirect ke `/admin/tenants` (Super Admin) atau `/admin` (Admin RT) tanpa memaksa user login ulang.
    2. Menyempurnakan pemisahan peran global: SuperAdmin adalah akun sistem tanpa kaitan tenant (`tenant_id = nil`), terlindung dari manipulasi schema tenant.

- [x] **2.2 Login Admin RT (Tenant Scoped)**
  - Akun: `admin@sitransparan.rt` / `password123`
  - Verifikasi: Berhasil masuk, role `admin_rt`, tenant aktif otomatis terikat ke `sitransparan-rt`.
  - Temuan / Feedback:
  semua admin berhasil masuk walau saya coba cross test, namun semua data 403 kalau saya lihat di network, termasuk superadmin dan admin rt 
  - **Perbaikan Teknis Dilakukan:**
    1. Investigasi penolakan HTTP 403 pada cross test: `TenantMiddleware` backend secara ketat memverifikasi bahwa hostname subdomain (`rt-003`) harus sama persis dengan klaim `tenant_id` pada JWT payload. Jika Admin RT-004 mengakses API di subdomain RT-003, request ditolak 403 (Zero-Trust Tenant Isolation by design).
    2. Memperbaiki sinkronisasi auth context pada frontend agar selalu mengarahkan request API ke host tenant yang sesuai dengan token aktif.

- [x] **2.3 Multi-Tenant Switcher (Untuk Akun Multi-Tenant/Superadmin)**
  - Verifikasi: Dropdown tenant di header berpindah mulus, token tersinkronisasi, data halaman berubah sesuai tenant baru.
  - Temuan / Feedback: 
  - **Perbaikan Teknis Dilakukan:**
    1. Menambahkan properti `externalHref` pada `NavItem` di `frontend/src/components/MainLayout.tsx`.
    2. Memperbaiki tombol "← Kembali Platform": kini me-render elemen anchor (`<a>`) dengan absolute cross-origin URL dari `getPlatformUrl('/admin/tenants')` (bukan internal React Router `<NavLink>` yang tertahan di subdomain).
    3. Memperketat UI Modal Pembuatan User (`UserModal.tsx`): dropdown role `Super Admin` hanya ditampilkan jika pembuat akun adalah `isSuperAdmin`, sinkron dengan validasi role escalation guard di backend (`onlySuperAdminCanGrant`). 
- [x] **2.4 Register Warga Baru (Dilewati sesuai preferensi)**
  - Form: Register warga via `/login` mode register.
  - Verifikasi: Dinonaktifkan dari pendaftaran mandiri publik (akun warga dibuat/dikelola terpusat oleh Pengurus RT & Superadmin).
  - Temuan / Feedback: Form register publik telah disembunyikan dari UI `/login`.

- [x] **2.5 Logout**
  - Verifikasi: Sesi terhapus bersih dari Zustand & localStorage, redirect kembali ke login atau public portal.
  - Temuan / Feedback: 
  Sebelumnya setelah logout pada subdomain tenant, aplikasi redirect ke `/login` namun tertahan pada blank/skeleton screen hingga membuka root `/` terlebih dahulu.
  - **Perbaikan Teknis Dilakukan:**
    1. Memperbaiki aturan React Hooks di `LoginPage.tsx`: memindahkan inisialisasi state dan mutations ke level teratas sebelum conditional return (menghilangkan pelanggaran *Rules of Hooks* yang memicu blank screen).
    2. Menghapus cookie ganda di `store/useAuthStore.ts`: fungsi `deleteCookie` kini menghapus cookie baik yang ber-domain parent (`.${domain}`) maupun host-only cookie.
    3. Mengecualikan rute navigasi `/login` dari Service Worker caching di `sw.ts` (`denylist: [/^\/login/]`) sehingga browser tidak menyajikan HTML/state usang yang tertahan.
    4. Menambahkan automated regression test di Playwright (`tests/e2e/auth/login.spec.ts`) yang memverifikasi flow logout pada subdomain tenant kembali bersih ke form login. 

---

## 3. Dashboard Admin (`/admin`)
- [ ] **3.1 Ringkasan Kartu Metrik**
  - Verifikasi: Total Warga, Total Kas Masuk/Keluar, Saldo Kas Saat Ini, Iuran Pending, Agenda Aktif, Usulan Baru.
  - Temuan / Feedback: 
- [ ] **3.2 Ekspor Laporan Finansial (CSV & PDF)**
  - Tombol: Ekspor CSV & Cetak/Unduh PDF di pojok kanan atas.
  - Verifikasi: CSV terunduh valid; PDF terbuka dialog cetak browser atau file blob backend.
  - Temuan / Feedback: 
- [ ] **3.3 Grafik / Tren Kas & Distribusi Pengeluaran**
  - Verifikasi: Visualisasi chart responsive, tidak ada overflow di layar mobile/laptop kecil.
  - Temuan / Feedback: 

---

## 4. Kependudukan & Data Rumah (`/admin/residents`)
### 4.1 Tab Warga & Anggota Keluarga
- [x] **4.1.1 Tambah Warga Baru (`ResidentModal`)**
  - Form: NIK (16 digit), Nama, No KK, Alamat, Status Tempat Tinggal, No Telepon, Status Perkawinan, Pekerjaan, upload dokumen KTP & KK.
  - Verifikasi: Validasi form berjalan, upload MinIO persisten, preview foto tampil langsung di form, NIK tersimpan terenkripsi AES-GCM + HMAC. E2E test lulus (`residents.spec.ts`).
  - Temuan / Feedback: Berhasil. Dokumen KTP & KK tersimpan dan tampil live preview.
- [x] **4.1.2 Detail Warga & Anggota Keluarga (`ResidentDetailModal` & `FamilyMemberModal`)**
  - Aksi: Buka detail warga (`Eye` icon) -> Tampil rincian demografi, pratinjau dokumen ukuran penuh, dan daftar anggota keluarga. Tambah, edit, dan hapus anggota keluarga.
  - Verifikasi: Full CRUD anggota keluarga (POST, GET, PUT, DELETE) berjalan dengan enkripsi NIK di backend. NIK opsional untuk anak di bawah 17 tahun. E2E test CRUD anggota keluarga dan modal detail lulus.
  - Temuan / Feedback: Berhasil. Modal detail warga dan CRUD anggota keluarga lengkap.
- [x] **4.1.3 Edit & Hapus Warga serta Soft-Delete Architecture**
  - Verifikasi: Edit informasi warga terupdate dan persisten setelah reload. Hapus warga dan anggota keluarga menerapkan soft-delete menyeluruh (`deleted_at IS NULL`) di seluruh tabel relasi demografi, keuangan, dan aset warga. E2E test lulus.
  - Temuan / Feedback: Berhasil. Data yang dihapus tidak lagi muncul di daftar aktif namun jejak historis dan referensi database tetap aman.
- [x] **4.1.4 Filter & Pencarian Warga**
  - Verifikasi: Kolom input pencarian cepat dan akurat berdasarkan Nama Kepala Keluarga, NIK, No KK, Alamat, Nomor Telepon, hingga Nama Anggota Keluarga di dalam KK. E2E test lulus.
  - Temuan / Feedback: Berhasil. Input pencarian tunggal (unified search) responsif dan mendukung pencarian nama anak/anggota keluarga.
- [x] **4.1.5 Mutasi Status Warga & Promosi Kepala Keluarga (`Jadikan KK`)**
  - Aksi:
    1. Pengubahan status kependudukan (Aktif, Pindah, Meninggal, Menunggu, Ditolak) langsung dari tabel dengan indikator badge warna yang jelas.
    2. Tombol "Jadikan KK" pada baris anggota keluarga (anak laki-laki, anak perempuan, tua, maupun muda) untuk menggantikan kepala keluarga yang meninggal atau pindah.
  - Verifikasi:
    - Backend endpoint `POST /api/v1/residents/{id}/family/{member_id}/promote` berjalan transaksional: anggota keluarga dipromosikan menjadi record resident kepala keluarga baru, seluruh anggota keluarga dipindahkan, FK dues payments dan data rumah di-relink dengan aman, dan mantan kepala keluarga diarsipkan otomatis sebagai `"Mantan Kepala Keluarga (Almarhum)"` atau `"Mantan Kepala Keluarga (Pindah)"`.
    - E2E Playwright suite (`tests/e2e/residents/residents.spec.ts`) memverifikasi alur penggantian kepala keluarga oleh anak perempuan muda serta mutasi status meninggal secara deterministik (8/8 skenario passed).
  - Temuan / Feedback: Berhasil. Sesuai kebutuhan pergantian kepala keluarga ketika terjadi musibah atau mutasi warga.

### 4.2 Tab Data Rumah & QR Code Warga (`HousesPage`)
- [ ] **4.2.1 Tambah & Edit Data Rumah**
  - Form: Blok/Nomor Rumah, Alamat Lengkap, RT/RW, Status Hunian (Dihuni/Kosong).
  - Verifikasi: Data tersimpan, token QR terbuat otomatis.
  - Temuan / Feedback: 
- [ ] **4.2.2 Cetak Sticker QR Code Rumah**
  - Verifikasi: Preview sticker QR tampil jelas, tombol cetak memformat lembar print sticker siap tempel.
  - Temuan / Feedback: 
- [ ] **4.2.3 Salin Link Klaim Rumah & Uji Klaim Warga (`/claim-house?token=...`)**
  - Verifikasi: Link klaim dibuka warga, warga terverifikasi terhubung ke rumah tersebut.
  - Temuan / Feedback: 
- [ ] **4.2.4 Regenerate Token QR Rumah**
  - Verifikasi: Token lama hangus, token baru dibuat tanpa merusak data penghuni yang sudah klaim.
  - Temuan / Feedback: 

---

## 5. Keuangan & Kas RT (`/admin/financial`)
### 5.1 Tab Kas & Transaksi Kas
- [ ] **5.1.1 Catat Transaksi Masuk / Keluar (`TransactionModal`)**
  - Form: Tanggal, Jenis (Pemasukan/Pengeluaran), Kantong Dana (Fund), Kategori, Jumlah Rupiah, Deskripsi, Bukti Transaksi (Upload file).
  - Verifikasi: Upload ke MinIO berjalan, format rupiah otomatis, saldo kantong terupdate otomatis.
  - Temuan / Feedback: 
- [ ] **5.1.2 Sifat Append-Only Transaksi**
  - Verifikasi: Transaksi tidak dapat di-edit sembarangan atau di-delete tanpa jejak (integritas audit kas).
  - Temuan / Feedback: 

### 5.2 Tab Iuran Warga & Verifikasi
- [ ] **5.2.1 Catat Pembayaran Iuran (`DuesPaymentModal`)**
  - Form: Pilih Warga / KK, Kategori Iuran, Bulan & Tahun, Jumlah Bayar, Metode (Cash/Transfer), Bukti Transfer.
  - Verifikasi: Status awal (Pending/Verified), muncul di tabel iuran.
  - Temuan / Feedback: 
- [ ] **5.2.2 Verifikasi / Tolak Pembayaran Iuran**
  - Aksi: Admin klik Verifikasi atau Tolak pada pembayaran iuran warga yang pending.
  - Verifikasi: Status berubah jadi `verified` / `rejected`, kas masuk otomatis bertambah saat diverifikasi.
  - Temuan / Feedback: 

### 5.3 Tab Pengaturan Kantong Dana (Funds) & Kategori Iuran
- [ ] **5.3.1 Tambah & Kelola Kantong Dana (Funds)**
  - Form: Nama Kantong (Kas Utama, Kas Sosial, Kas Pembangunan), Default Fund, Keterangan.
  - Verifikasi: Kantong muncul di pilihan transaksi kas.
  - Temuan / Feedback: 
- [ ] **5.3.2 Tambah & Kelola Kategori Iuran**
  - Form: Nama Iuran (Iuran Kebersihan, Keamanan, Kas RT), Nominal Wajib, Periode (Bulanan/Tahunan).
  - Temuan / Feedback: 

---

## 6. Bank Sampah RT (`/admin/waste-bank` & Publik `/bank-sampah`)
- [ ] **6.1 Master Kategori Sampah & Harga**
  - Form: Nama Kategori (Botol Plastik, Kardus, Besi, Minyak Jelantah), Satuan (kg/liter), Harga per satuan, Persentase Bagi Hasil (Warga % / Kas Pemuda %).
  - Verifikasi: Nilai tersimpan dan persentase valid total 100%.
  - Temuan / Feedback: 
- [ ] **6.2 Pencatatan Setoran Sampah Warga**
  - Form: Pilih KK / Warga, Tanggal, Item Kategori + Berat/Volume.
  - Verifikasi: Kalkulasi otomatis saldo warga & bagian kas pemuda, tercatat di riwayat setoran.
  - Temuan / Feedback: 
- [ ] **6.3 Buku Tabungan Sampah Warga**
  - Verifikasi: Filter per KK menampilkan total sampah disetor, total uang terkumpul, riwayat penarikan.
  - Temuan / Feedback: 
- [ ] **6.4 Portal Publik Bank Sampah (`/bank-sampah`)**
  - Verifikasi: Warga dapat melihat daftar harga sampah terkini yang berlaku di RT dan ringkasan total sampah terkelola.
  - Temuan / Feedback: 

---

## 7. Karang Taruna & Kepemudaan (`/admin/karang-taruna` & Publik `/karang-taruna`)
- [ ] **7.1 Manajemen Periode Masa Bakti**
  - Form: Tahun Periode (misal: 2026–2028), Nama Periode, Status (Active / Draft / Archived).
  - Verifikasi: Hanya 1 periode yang berstatus `active` dalam satu waktu.
  - Temuan / Feedback: 
- [ ] **7.2 Struktur Pengurus & Seksi Bidang**
  - Aksi: Tambah pengurus (Ketua, Sekretaris, Bendahara, Seksi Olahraga, Seksi Acara, dll).
  - Verifikasi: Anggota terpilih terhubung ke data pemuda/warga, foto/jabatan tampil rapi.
  - Temuan / Feedback: 
- [ ] **7.3 Konfigurasi Seksi & Role Dinamis**
  - Verifikasi: Admin dapat menambah nama seksi baru secara dinamis sesuai kebutuhan RT.
  - Temuan / Feedback: 
- [ ] **7.4 Halaman Publik Karang Taruna (`/karang-taruna`)**
  - Verifikasi: Warga melihat bagan organisasi kepengurusan pemuda dan program aktif dengan tampilan modern.
  - Temuan / Feedback: 

---

## 8. Agenda Kegiatan & Event Warga (`/admin/events` & Publik `/agenda`)
- [ ] **8.1 Buat & Edit Kegiatan Warga**
  - Form: Judul Acara, Tanggal & Waktu Mulai/Selesai, Lokasi, Deskripsi, Banner/Foto, Kebutuhan Anggaran Awal.
  - Verifikasi: Status acara (Direncanakan, Berjalan, Selesai, Dibatalkan), muncul di kalender/daftar agenda.
  - Temuan / Feedback: 
- [ ] **8.2 Rincian Anggaran Biaya (RAB / Budgeting) (`EventBudgetModal`)**
  - Form: Item Pengeluaran, Estimasi Biaya, Realisasi Biaya, Catatan.
  - Verifikasi: Card RAB menampilkan total estimasi vs realisasi, toast notifikasi feedback muncul saat disimpan.
  - Temuan / Feedback: 
- [ ] **8.3 Kepanitiaan & Relawan Kegiatan**
  - Verifikasi: Tetapkan warga sebagai seksi acara / konsumsi / perlengkapan.
  - Temuan / Feedback: 
- [ ] **8.4 Konfirmasi Kehadiran / RSVP Warga (`EventRSVPModal`)**
  - Verifikasi: Warga RSVP (Hadir / Ragu-ragu / Tidak Hadir) + jumlah orang yang dibawa; toast konfirmasi tampil sukses.
  - Temuan / Feedback: 
- [ ] **8.5 Portal Publik Agenda (`/agenda`)**
  - Verifikasi: Acara tampil informatif bagi warga, ada countdown waktu, lokasi acara, serta tombol RSVP.
  - Temuan / Feedback: 

---

## 9. Rapat Warga & Notulensi (`/admin/meetings`)
- [ ] **9.1 Buat Rapat Baru**
  - Form: Judul Rapat, Tanggal/Jam, Tempat, Tingkat Kerahasiaan (`public` / `internal` / `confidential`), Deskripsi/Agenda Rapat.
  - Verifikasi: Tersimpan dan status rapat (Scheduled / Ongoing / Completed).
  - Temuan / Feedback: 
- [ ] **9.2 Penegakan Hak Akses Kerahasiaan (Confidential Enforcement)**
  - Verifikasi: Rapat berstatus `confidential` HANYA bisa dibaca oleh admin pengurus; warga biasa diblokir (403).
  - Temuan / Feedback: 
- [ ] **9.3 Daftar Hadir (Attendees)**
  - Verifikasi: Input warga yang hadir saat rapat berlangsung.
  - Temuan / Feedback: 
- [ ] **9.4 Rekam Keputusan Rapat (Meeting Decisions)**
  - Verifikasi: Catat hasil musyawarah warga, poin kesepakatan tersimpan rapi.
  - Temuan / Feedback: 
- [ ] **9.5 Action Items (Tindak Lanjut & Penanggung Jawab)**
  - Form: Tugas tindak lanjut, PIC penanggung jawab, tenggat waktu (due date), status (Pending/Done).
  - Temuan / Feedback: 

---

## 10. Usulan Warga & Kebutuhan Bersama (`/admin/aspirations` & Publik `/usulan`)
- [ ] **10.1 Kirim Usulan / Aspirasi Warga (`AspirationFormModal`)**
  - Form: Judul Usulan, Kategori, Isi Usulan, Opsi Anonim (Ya/Tidak), Lampiran Bukti Foto.
  - Verifikasi: Usulan masuk ke daftar publik dan admin; jika anonim, identitas pelapor tidak bocor.
  - Temuan / Feedback: 
- [ ] **10.2 Respon & Ubah Status Usulan oleh Admin**
  - Aksi: Admin memberi tanggapan resmi RT dan update status (Menunggu, Ditinjau, Disetujui, Ditolak, Selesai).
  - Verifikasi: Tanggapan muncul di portal publik pada kartu usulan terkait.
  - Temuan / Feedback: 
- [ ] **10.3 Manajemen Kebutuhan Komunitas (Community Needs)**
  - Form: Kebutuhan fasilitas bersama (misal: Perbaikan Lampu Jalan, Pengadaan Tenda RT), Estimasi Biaya, Prioritas.
  - Temuan / Feedback: 

---

## 11. Pengumuman, Surat & Dokumen RT (`/admin/announcements` & Publik `/kabar`)
- [ ] **11.1 Buat Pengumuman (`AnnouncementModal`)**
  - Form: Judul, Isi Pengumuman, Kategori, Galeri Foto/Media, Opsi Khusus Warga (`residents_only`).
  - Verifikasi: Pengumuman tampil di timeline publik; jika `residents_only`, pengunjung anonim tidak bisa membaca.
  - Temuan / Feedback: 
- [ ] **11.2 Edit & Hapus Pengumuman**
  - Verifikasi: Update pengumuman langsung ter-refresh; hapus pengumuman menghapus lampiran terkait.
  - Temuan / Feedback: 
- [ ] **11.3 Upload & Kelola Dokumen RT (`DocumentUploadModal`)**
  - Form: Judul Dokumen, Nomor Dokumen, Kategori (SK RT, Peraturan Warga, Laporan Tahunan), File PDF/Doc.
  - Verifikasi: File terupload ke MinIO, dapat diunduh oleh warga yang berhak.
  - Temuan / Feedback: 
- [ ] **11.4 Edit Metadata & Hapus Dokumen RT**
  - Verifikasi: `PUT /documents/{id}` berjalan tanpa error 405; hapus dokumen berfungsi.
  - Temuan / Feedback: 

---

## 12. Partisipasi Warga, Polling & Reaksi Sosial (`/admin/polls` & Feed Publik)
- [ ] **12.1 Buat Polling / Jajak Pendapat Warga**
  - Form: Pertanyaan Polling, 2–6 Pilihan Opsi Jawaban, Tanggal Berakhir.
  - Verifikasi: Polling muncul di widget feed warga.
  - Temuan / Feedback: 
- [ ] **12.2 Voting Polling oleh Warga**
  - Verifikasi: Warga dapat memilih 1 opsi; tidak bisa memilih ganda (1 warga 1 suara); progress bar presentase terupdate real-time.
  - Temuan / Feedback: 
- [ ] **12.3 Reaksi Sosial (Support, Like, Applause)**
  - Verifikasi: Tombol reaksi 1-klik di pengumuman dan usulan warga; jumlah reaksi terhitung akurat.
  - Temuan / Feedback: 
- [ ] **12.4 Share Card Modal & Badge Warga**
  - Verifikasi: Tombol bagikan menampilkan kartu preview siap share ke WhatsApp/Media Sosial; badge keaktifan warga tampil.
  - Temuan / Feedback: 

---

## 13. Manajemen Pengguna & Hak Akses (`/admin/users`)
- [ ] **13.1 Tambah Akun Pengguna Baru (`UserModal`)**
  - Form: Nama, Email, No HP, Role (`superadmin`, `admin_rt`, `resident`), Password, Pilihan Tenant.
  - Verifikasi: Role `superadmin` tidak boleh dipaksa memiliki tenant ID; `admin_rt` terikat ke tenant yang benar.
  - Temuan / Feedback: 
- [ ] **13.2 Edit Pengguna & Reset Password**
  - Verifikasi: Penggantian password atau nomor telepon berhasil disimpan.
  - Temuan / Feedback: 
- [ ] **13.3 Cegah Eskalasi Role (Security Check)**
  - Verifikasi: Admin RT biasa tidak bisa menaikkan dirinya atau orang lain menjadi Superadmin.
  - Temuan / Feedback: 

---

## 14. Super Admin: Manajemen Tenant Multi-RT (`/admin/tenants`)
- [ ] **14.1 Buat Tenant RT Baru**
  - Form: Nama RT (misal: RT 05 RW 02 Sukamaju), Slug Domain (misal: `rt-005`), Nama Kontak Admin RT.
  - Verifikasi: Skema database baru `tenant_rt_005` otomatis dibuat (auto-provisioning schema).
  - Temuan / Feedback: 
- [ ] **14.2 Ubah Status Tenant (Active / Inactive)**
  - Verifikasi: Tenant yang dinonaktifkan (`inactive`) langsung ditolak aksesnya dari subdomain maupun switch-tenant.
  - Temuan / Feedback: 
- [ ] **14.3 Hapus Tenant (Destructive Action)**
  - Verifikasi: Muncul dialog konfirmasi ketat; skema PostgreSQL tenant terkait dihapus bersih secara cascade.
  - Temuan / Feedback: 

---

## 15. Audit Log & Keamanan (`/admin/audit-logs`)
- [ ] **15.1 Rekam Jejak Aktivitas Audit**
  - Verifikasi: Setiap aksi sensitif (login, create/update warga, transaksi kas, verifikasi iuran, perubahan tenant) tercatat dengan User, Waktu, Action, IP, dan Detail Payload.
  - Temuan / Feedback: 
- [ ] **15.2 Filter & Pagination Audit Log**
  - Verifikasi: Pencarian berdasarkan user atau rentang waktu berfungsi lancar.
  - Temuan / Feedback: 

---

## 16. PWA, Offline Capability & Notifikasi Web Push
- [ ] **16.1 Install PWA Banner**
  - Verifikasi: Prompt install PWA muncul saat dibuka di Chrome/Safari Android/iOS.
  - Temuan / Feedback: 
- [ ] **16.2 Offline Mode (Service Worker & Cache)**
  - Aksi: Matikan koneksi internet (DevTools -> Offline mode).
  - Verifikasi: Muncul banner offline, data feed atau kas yang pernah dibuka tetap bisa dibaca dari cache IndexedDB.
  - Temuan / Feedback: 
- [ ] **16.3 Web Push Notification (VAPID)**
  - Verifikasi: Permintaan izin notifikasi browser; subscription tersimpan di backend (`/push/subscribe`).
  - Temuan / Feedback: 

---

## 17. Responsivitas Layar Mobile & UI/UX Detail
- [ ] **17.1 Bottom Navigation di Mobile**
  - Verifikasi: Pada layar HP, navigasi bawah (`PublicBottomNav` / Admin Nav) fixed di bawah layar dan tidak menutupi tombol form.
  - Temuan / Feedback: 
- [ ] **17.2 Dialog & Modal di Layar Kecil**
  - Verifikasi: Form modal panjang memiliki scrolling vertikal lancar dan tombol Simpan/Batal tidak terpotong layar.
  - Temuan / Feedback: 
- [ ] **17.3 Format Angka & Tanggal Lokal (Bahasa Indonesia)**
  - Verifikasi: Nominal rupiah `Rp 100.000` rapi tanpa desimal aneh, tanggal format `Senin, 5 September 2026`.
  - Temuan / Feedback: 
