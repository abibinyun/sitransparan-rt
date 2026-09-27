# Design Specification — Modul Dokumentasi Internal Admin RT (Laravel Docs Style)

**Tanggal:** 2026-09-27  
**Status:** Draft / Ready for Review  
**Branch:** `dev`  
**Target Pengguna:** Admin RT (`admin_rt`) dan Super Admin (`superadmin`)  

---

## 1. Latar Belakang & Tujuan

Aplikasi Sitransparan RT/RW memiliki fitur yang kaya dan komprehensif (Multi-Fund kas RT, stiker QR rumah tangga & token, absensi petugas sampah & honorarium, musyawarah warga & notulensi, pengelolaan iuran, hingga portal transparansi publik).

Pengurus RT membutuhkan panduan operasional terpadu yang dapat diakses langsung dari dalam aplikasi web/PWA tanpa harus membuka file eksternal atau mencari tutorial terpisah. Modul ini mengadopsi format **Laravel Documentation Style**:
- Dua kolom: daftar isi sticky di kiri + reading pane terstruktur di kanan.
- Fitur pencarian instan (instant full-text filter).
- Alur bertahap (step-by-step SOP), callout alerts (Tips, Perhatian, Best Practice), serta pintasan langsung (*deep links*) ke menu operasional bersangkutan.

---

## 2. Arsitektur & Teknologi

### 2.1 File & Struktur Komponen
- `frontend/src/data/adminDocsData.ts`:
  - Struktur data TypeScript terpusat.
  - Memuat kategori, artikel, ikon, ringkasan, estimasi baca, dan seksi konten.
  - Zero-latency, mendukung mode offline PWA, dan bebas dependensi tambahan.
- `frontend/src/pages/AdminDocsPage.tsx`:
  - Komponen halaman dokumentasi utama.
  - Menampilkan layout responsif: drawer / sheet di mobile, sidebar sticky 2 kolom di desktop.
  - Fitur pencarian instan dengan debounce ringan dan penandaan kata kunci.
  - State navigasi URL berbasis slug: `/admin/panduan/:slug` (dengan fallback otomatis ke artikel pertama).
- `frontend/src/components/MainLayout.tsx`:
  - Penambahan menu `Buku Panduan RT` pada `baseNavItems` (ikon `BookOpen`).
  - Posisi di bawah modul operasional RT, di atas area profil/logout.
  - Guard hak akses: hanya tampil untuk `admin_rt` dan `superadmin`.
- `frontend/src/App.tsx`:
  - Pendaftaran rute lazy-loaded `/admin/panduan` dan `/admin/panduan/:slug`.

### 2.2 Model Data (`adminDocsData.ts`)

```typescript
export interface DocSection {
  heading: string;
  content: string[];
  steps?: {
    step: number;
    title: string;
    description: string;
    actionLink?: {
      label: string;
      to: string;
    };
  }[];
  callout?: {
    type: 'info' | 'warning' | 'tip';
    title: string;
    message: string;
  };
}

export interface DocArticle {
  slug: string;
  title: string;
  category: string;
  badge?: string;
  readTime: string;
  excerpt: string;
  sections: DocSection[];
}

export interface DocCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  articles: DocArticle[];
}
```

---

## 3. Rincian Modul Konten Awal (6 Kategori Utama)

### 3.1 Kategori 1: Panduan Memulai & Onboarding Pengurus
- **Hak Akses & Peran**: Perbedaan hak akses antara Admin RT (akses penuh), Operator (operasional), dan Resident (warga).
- **Checklist Aktivasi RT**: Langkah awal melengkapi profil RT, rekening/dompet kas, dan daftar wilayah blok rumah.

### 3.2 Kategori 2: Tata Kelola Kependudukan & Stiker QR Rumah
- **Manajemen Warga & KK**: Pendaftaran warga, pengaitan anggota keluarga (KK), verifikasi akun warga baru.
- **Master Data Rumah & QR Token**: Pembuatan nomor blok/rumah, cetak stiker QR rumah tangga untuk stempel absensi dan polling, serta prosedur reset PIN 4-digit mandiri rumah.

### 3.3 Kategori 3: Keuangan Transparan & Kantong Kas (Multi-Fund)
- **Setup Multi-Kantong Kas**: Pembagian likuiditas kas operasional, kas sosial, kas kepemudaan, dan kas pembangunan infrastruktur.
- **Iuran Warga & Verifikasi**: Pembuatan tarif iuran, upload bukti bayar warga, verifikasi/penolakan pembayaran.
- **Pencatatan Transaksi Buku Besar**: Sifat append-only transaksi RT, kategori kas masuk/keluar, pelimpahan PIC kas.
- **Export Laporan Keuangan**: Prosedur ekspor laporan realisasi bulanan format CSV dan cetak PDF resmi.

### 3.4 Kategori 4: Kegiatan, Rapat Warga & Notulensi
- **Penyusunan Kegiatan & RAB**: Estimasi anggaran biaya, persetujuan pengurus, unggah proposal kegiatan.
- **LPJ & Laporan Pertanggungjawaban**: Unggah bukti nota realisasi dan arsip dokumen LPJ.
- **Musyawarah & Notulensi RT**: Penjadwalan rapat warga, pembatasan visibilitas (publik vs internal), absensi kehadiran, dan pencatatan poin keputusan (action items).

### 3.5 Kategori 5: Pemberdayaan Pemuda & Bank Sampah Digital
- **Struktur Organisasi Karang Taruna**: Masa bakti kepengurusan, bagan hierarki ketua/seksi, SK pengangkatan.
- **Petugas & Absensi Tugas Sampah**: Pencatatan kehadiran petugas penarikan sampah, perhitungan otomatis honorarium kehadiran (Rp 5.000/orang/sesi).
- **Operasional Bank Sampah**: Master kategori sampah & harga dinamis, persentase bagi hasil warga-pemuda, pencatatan timbangan setoran per KK, dan buku tabungan warga.

### 3.6 Kategori 6: Komunikasi Warga & Portal Transparansi
- **Pengumuman & Arsip Dokumen**: Publikasi kabar RT dengan multi-lampiran foto/dokumen, pengaturan komentar warga.
- **Aspirasi & Kebutuhan Lingkungan**: Moderasi usulan warga, tindak lanjut status, publikasi progres.
- **Polling & Voting Digital**: Pembuatan voting warga berbasis 1 suara per rumah atau per warga, penutupan polling resmi.

---

## 4. Rencana Pengujian & Verifikasi
1. **Typecheck & Build**:
   - `cd frontend && npx tsc --noEmit` wajib exit 0.
2. **E2E Playwright Regression**:
   - Tambah test di `tests/e2e/admin/docs.spec.ts`:
     - Verifikasi akses menu `/admin/panduan` oleh Admin RT.
     - Verifikasi proteksi hak akses: warga ditolak/di-redirect jika mencoba membuka `/admin/panduan`.
     - Verifikasi fitur pencarian (search keyword menampilkan artikel yang relevan).
     - Verifikasi klik navigasi antar artikel dan tombol pintasan aksi (*action links*).
     - Verifikasi responsivitas mobile (tampilan drawer/accordion rapi tanpa overflow horizontal).
