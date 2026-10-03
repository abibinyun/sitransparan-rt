# Cetak Biru Perombakan UI/UX & Identitas Visual Portal Publik SiTransparan RT/RW
**Versi:** 2.0.0 | **Status:** Proposal Desain & Arsitektur Frontend | **Target:** Anti AI-Slop, High-Performance, Mobile-First PWA

---

## 1. Analisis & Diagnosa Kondisi UI/UX Saat Ini

### 1.1 Masalah Tampilan & Interaksi Eksisting
1. **Platform Landing Page (`/`)**:
   - Hero section bernuansa gelap generik khas SaaS developer tooling, kurang menyentuh identitas sosiologis guyub warga & transparansi komunitas RT/RW di Indonesia.
   - Direktori pencarian RT masih kaku, kartu RT belum menampilkan preview metrik hidup (jumlah warga terdaftar, status kas aktif).
2. **Portal Subdomain Tenant (`PublicLayout`, `PublicAnnouncementsPage`)**:
   - Header dan top bar terpisah secara kaku, kontras warna antara emerald-slate kurang harmonis pada layar OLED ponsel.
   - Feed pengumuman dan dokumen bercampur dengan layout asimetris yang terasa sesak di layar tablet/desktop menengah.
3. **Agenda & Kegiatan (`PublicEventsPage`)**:
   - Garis timeline flat tanpa pemisah tanggal berbasis kalender interaktif visual yang kuat. Tombol RSVP kurang menonjol sebagai aksi partisipatif utama.
4. **Aspirasi & Kebutuhan Lingkungan (`PublicAspirationsPage`)**:
   - Filter usulan/keluhan dan form aspirasi butuh *visual feedback* yang lebih humanis dan proteksi privasi warga yang gamblang.
5. **Karang Taruna (`PublicKarangTarunaPage`)**:
   - Struktur bagan pengurus masih berupa list kartu monoton. Butuh visualisasi struktur organisasi modern (Bagan Inti -> Seksi Bidang Kreatif) dengan badge peran yang atraktif.
6. **Bank Sampah (`PublicWasteBankPage`)**:
   - Metrik kiloan & rupiah sudah ada tetapi belum memiliki kalkulator interaktif simulasi setoran sampah (misal: hitung estimasi rupiah dari sekian kg botol plastik/kardus) yang memicu warga ikut menyetor.
7. **Mobile Bottom Navigation (`PublicBottomNav`)**:
   - Ukuran ikon dan label teks terlalu padat (6 tab berdempetan), butuh penataan ergonomis *thumb-friendly* dengan indikator tab aktif yang intuitif.

---

## 2. Brand Identity & Prinsip Desain "Anti AI-Slop"

### 2.1 Filosofi Brand: *Modern Civic Transparency*
- **Karakter Visual**: Bersih, berwibawa, jujur, hangat, dan sangat mudah dipahami warga segala usia (dari pemuda Karang Taruna hingga sesepuh warga).
- **Anti AI-Slop Manifesto**:
  1. **TIDAK ADA** gradien ungu neon generik atau efek *glassmorphism* buram berlebihan yang memperberat rendering HP kentang.
  2. **TIDAK ADA** ilustrasi 3D AI tanpa konteks. Gunakan ikonografi fungsional SVG berbobot konsisten (Lucide Icons) dan visualisasi data nyata.
  3. **Tipografi Berkarakter**: *Plus Jakarta Sans* (karya desainer Indonesia) dengan skala modular tegas, *letter-spacing* terukur, dan tabular font untuk seluruh nilai uang/Rupiah.
  4. **Struktur Border & Bayangan**: Menggantikan *glow* neon dengan *crisp hairline borders* (`border-slate-200/80`), *subtle depth shadows* (`box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 10px 15px -5px rgba(0,0,0,0.04)`), dan sudut *rounded-2xl* yang ergonomis.

### 2.2 Palet Warna & Visual Token (Design Tokens)

| Token | Nilai Hex / Tailwind | Peran Psikologis & Penggunaan |
|---|---|---|
| **Deep Civic Slate** (Background Hero & Primary Text) | `#0F172A` (`slate-900`), `#1E293B` (`slate-800`) | Menampilkan wibawa institusi, ketegasan data, dan kontras tajam. |
| **Transparency Emerald** (Brand Accent & Verifikasi) | `#059669` (`emerald-600`), `#10B981` (`emerald-500`), `#ECFDF5` (`emerald-50`) | Melambangkan kas sehat, keterbukaan, ekologi, dan aksi positif. |
| **Civic Amber / Saffron** (Aspirasi & Perhatian) | `#D97706` (`amber-600`), `#FEF3C7` (`amber-50`) | Menandai usulan baru, agenda mendesak, atau status peninjauan. |
| **Youth Indigo** (Karang Taruna & Kolaborasi) | `#4F46E5` (`indigo-600`), `#EEF2FF` (`indigo-50`) | Menggambarkan energi pemuda, inovasi kegiatan warga, dan olahraga. |
| **Clean Surface** | `#FFFFFF`, `#F8FAFC` (`slate-50`), `#F1F5F9` (`slate-100`) | Background konten bersih yang menjaga fokus mata warga pada informasi. |

---

## 3. Rencana Restrukturisasi Halaman & Komponen

```
                             PORTAL PUBLIK CITIZEN EXPERIENCE
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
1. Platform Hub (/)                  2. Subdomain Portal                  3. Micro-Widgets & Tools
 - Hero: Live Civic Transparency      - Sticky Brand Header & Kas Strip    - Live Kas Kantong Summary
 - Tenant Finder with Realtime Badge  - Tab Bar & Mobile Bottom Nav (5)    - Interactive Waste Calculator
 - Platform Security & Multi-Tenant   - Universal Search & Filter Bar      - Organisasi Karang Taruna Tree
 - Civic Roadmap & CTA                - Push Notification Quick-Toggle     - Quick RSVP & Citizen Reaction
```

### 3.1 Detail Peningkatan per Halaman

#### A. Platform Landing Page (`PlatformLandingPage.tsx`)
- **Hero Transparansi**: Judul kuat *"Tata Kelola Rukun Tetangga yang Terang, Rapi, & Berdaya Bersama"*. Menampilkan banner preview live dashboard transparansi kas kasbon/iuran.
- **Tenant Explorer**: Grid kartu RT dengan status aktif, lokasi, cuplikan saldo kas transparan, dan tautan langsung ke portal publiknya.
- **Nilai Gotong Royong Digital**: 4 pilar utama (Kas Multi-Kantong Tanpa Modus, Musyawarah & Notula Sah, Bank Sampah Berbagi Hasil, Arsip Surat & KK Aman).

#### B. Portal Subdomain Layout (`PublicLayout.tsx` & `PublicBottomNav.tsx`)
- **Compact Civic Bar**: Menampilkan nama RT, status keterbukaan, saldo kas live, dan tombol PWA install.
- **Ergonomic Header**: Navigasi bersih dengan indikator *active pill*, foto/logo RT, serta akses cepat ke notifikasi push web.
- **Mobile Bottom Bar yang Disempurnakan**: 5 item proporsional (*Kabar*, *Usulan*, *Agenda*, *Pemuda*, *Sampah*) + trigger *Login/Warga* yang mudah dijangkau satu tangan.

#### C. Halaman Pengumuman & Dokumen (`PublicAnnouncementsPage.tsx`)
- **Feed Card Visual**: Kartu pengumuman dengan thumbnail galeri foto yang rapi, tombol reaksi sosial warga (*Mendukung, Mengapresiasi, Setuju*), widget jajak pendapat (Polling), dan *Share Card Generator* untuk WhatsApp warga.
- **Bilah Dokumen Transparansi**: Filter kategori dokumen (SK, LPJ Kas, Notula Musyawarah, Peraturan RT) dengan tombol download cepat & ukuran file jelas.

#### D. Halaman Aspirasi & Kebutuhan (`PublicAspirationsPage.tsx`)
- **Status Stepper**: Timeline visual status usulan warga (*Terkirim -> Ditinjau Pengurus -> Dianggarkan -> Selesai*).
- **Form Aspirasi Ramah Ponsel**: Input kategori jelas (Saran, Keluhan, Usulan Sarpras), proteksi opsi anonim vs nama terang, dan indikator privasi data.

#### E. Halaman Agenda & Kegiatan (`PublicEventsPage.tsx`)
- **Timeline Kegiatan Berbasis Tanggal**: Kartu kalender dengan badge hari, jam, lokasi, rincian estimasi anggaran (RAB), dan modal RSVP kehadiran warga secara instan.

#### F. Halaman Karang Taruna (`PublicKarangTarunaPage.tsx`)
- **Struktur Organisasi Modern**: Visualisasi ketua, wakil, sekretaris, bendahara, dilanjutkan grid kartu seksi bidang pemuda (Olahraga, Seni Budaya, Humas, Lingkungan Hidup) dengan foto profil dan tugas pokok.

#### G. Halaman Bank Sampah (`PublicWasteBankPage.tsx`)
- **Live KPI Tracker**: Total kg sampah terkelola, jumlah KK berpartisipasi, total saldo warga cair, dan porsi kas Karang Taruna.
- **Simulasi Setoran Interaktif (Kalkulator Sampah)**: Warga bisa memilih jenis sampah (Kardus, Plastik, Minyak Jelantah, Kaleng) dan mengetik perkiraan berat (kg) untuk melihat estimasi rupiah yang didapatkan langsung.
- **Katalog Harga Transparan**: Tabel harga terkini per satuan dengan rincian rasio bagi hasil warga vs operasional pemuda.

---

## 4. Rencana Eksekusi & Validasi

1. **Fase 1: Styling System & Visual Tokens**
   - Update `tailwind.config.js` (konfigurasi warna civic, shadow halus, typography).
   - Poles `index.css` (custom utility class, animation feedback).
2. **Fase 2: Layout & Platform Landing**
   - Perbarui `PublicLayout.tsx`, `PublicBottomNav.tsx`, dan `PlatformLandingPage.tsx`.
3. **Fase 3: Halaman Modul Publik**
   - Perbarui `PublicAnnouncementsPage.tsx`, `PublicAspirationsPage.tsx`, `PublicEventsPage.tsx`.
   - Perbarui `PublicKarangTarunaPage.tsx` dan `PublicWasteBankPage.tsx` (termasuk fitur interaktif kalkulator).
4. **Fase 4: Uji Fungsional & E2E Regression**
   - Verifikasi build frontend (`npm run build`).
   - Eksekusi Playwright E2E test untuk seluruh rute publik.
   - Verifikasi performa responsif (Desktop, Tablet, Mobile 375px–420px).
