export interface DocActionLink {
  label: string;
  to: string;
}

export interface DocStep {
  step: number;
  title: string;
  description: string;
  actionLink?: DocActionLink;
}

export interface DocCallout {
  type: 'info' | 'warning' | 'tip';
  title: string;
  message: string;
}

export interface DocSection {
  heading: string;
  content: string[];
  steps?: DocStep[];
  callout?: DocCallout;
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

export const adminDocCategories: DocCategory[] = [
  {
    id: 'onboarding',
    name: '1. Memulai & Tata Kelola',
    description: 'Panduan hak akses pengurus RT, checklist aktivasi, dan keamanan.',
    iconName: 'ShieldCheck',
    articles: [
      {
        slug: 'hak-akses-dan-peran-pengurus',
        title: 'Hak Akses & Peran Pengurus RT',
        category: 'Memulai & Tata Kelola',
        badge: 'Dasar',
        readTime: '3 menit',
        excerpt: 'Memahami batasan akses Admin RT, Operator Lingkungan, dan Warga (Resident) dalam aplikasi.',
        sections: [
          {
            heading: 'Hierarki Peran dalam Sistem',
            content: [
              'Aplikasi Sitransparan RT/RW menerapkan Role-Based Access Control (RBAC) ketat berbasis database untuk menjamin integritas data kepengurusan dan keuangan.',
              'Terdapat 3 peran operasional utama di tingkat RT: Admin RT, Operator (Petugas Lapangan), dan Warga/Resident.',
            ],
            callout: {
              type: 'info',
              title: 'Prinsip Keamanan',
              message: 'Peran dan hak akses ditautkan langsung dengan database tenant RT Anda. Pengurus tidak dapat mengakses atau melihat data RT/tenant lain.',
            },
            steps: [
              {
                step: 1,
                title: 'Admin RT (Akses Penuh)',
                description: 'Memiliki wewenang verifikasi iuran, pencatatan mutasi kas multi-fund, manajemen warga, cetak QR rumah, dan penerbitan SK Karang Taruna.',
                actionLink: { label: 'Lihat Daftar Pengurus & User', to: '/admin/users' },
              },
              {
                step: 2,
                title: 'Operator Lingkungan',
                description: 'Diberikan kepada petugas inventaris, bendahara pembantu, atau sekretariat untuk mencatat operasional harian tanpa izin menghapus user atau tenant.',
              },
              {
                step: 3,
                title: 'Warga (Resident)',
                description: 'Akses transparansi kas publik, riwayat iuran keluarga sendiri, pengajuan aspirasi, dan partisipasi voting/polling.',
              },
            ],
          },
        ],
      },
      {
        slug: 'checklist-aktivasi-rt',
        title: 'Checklist Aktivasi Awal Lingkungan RT',
        category: 'Memulai & Tata Kelola',
        badge: 'Penting',
        readTime: '4 menit',
        excerpt: 'Langkah berurutan yang harus disiapkan pengurus saat pertama kali mengaktifkan sistem Sitransparan.',
        sections: [
          {
            heading: 'Langkah Memulai Sistem',
            content: [
              'Sebelum mengumumkan aplikasi kepada warga, pengurus RT disarankan menyelesaikan checklist konfigurasi awal data lingkungan.',
            ],
            callout: {
              type: 'tip',
              title: 'Rekomendasi',
              message: 'Lakukan setup data secara berurutan: Master Rumah & Blok dahulu, lalu import/tambah Warga, baru kemudian buat Kategori Iuran.',
            },
            steps: [
              {
                step: 1,
                title: 'Konfigurasi Wilayah Rumah & Blok',
                description: 'Daftarkan nomor rumah/blok di lingkungan RT Anda agar token QR rumah tangga otomatis terbit.',
                actionLink: { label: 'Buka Master Rumah & QR', to: '/admin/houses' },
              },
              {
                step: 2,
                title: 'Pendaftaran & Verifikasi Penduduk',
                description: 'Input data Kepala Keluarga dan anggota keluarga, lalu tautkan dengan nomor rumah masing-masing.',
                actionLink: { label: 'Kelola Kependudukan', to: '/admin/residents' },
              },
              {
                step: 3,
                title: 'Setup Kantong Kas & Tarif Iuran',
                description: 'Pastikan kantong kas operasional RT aktif dan atur nominal iuran rutin (misal: Iuran Sampah & Keamanan).',
                actionLink: { label: 'Pengaturan Kas & Iuran', to: '/admin/financial' },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kependudukan',
    name: '2. Kependudukan & Rumah QR',
    description: 'Tata kelola data KK, verifikasi kependudukan, stiker QR rumah, dan reset PIN.',
    iconName: 'Users',
    articles: [
      {
        slug: 'manajemen-warga-dan-kk',
        title: 'Pendaftaran Warga, Rumah & Akun Otomatis',
        category: 'Kependudukan & Rumah QR',
        badge: 'Operasional',
        readTime: '4 menit',
        excerpt: 'Alur fleksibel pendaftaran warga, pembuatan rumah langsung, dan akun portal yang otomatis terbuat.',
        sections: [
          {
            heading: 'Alur Fleksibel Kependudukan & Rumah',
            content: [
              'Data kependudukan di Sitransparan diamankan menggunakan enkripsi AES-256-GCM pada NIK dan penyimpanan dokumen identitas terisolasi per-tenant.',
              'Setiap pendaftaran rumah tangga otomatis menerbitkan akun portal warga (email rumah & default PIN 1234) tanpa menimpa atau merusak data KK yang sudah ada.',
            ],
            callout: {
              type: 'tip',
              title: '3 Opsi Alur Pendaftaran',
              message: 'Pengurus bebas memilih: (1) Buat warga dahulu lalu klik "+ Buat Rumah Baru" langsung dari formulir warga, (2) Buat master rumah dahulu lalu pilih rumah saat input warga, atau (3) Buat warga lalu atur Kepala Keluarga dari menu Rumah.',
            },
            steps: [
              {
                step: 1,
                title: 'Buka Modul Kependudukan',
                description: 'Navigasikan ke menu Kependudukan di sidebar, klik tombol "+ Tambah Warga".',
                actionLink: { label: 'Menu Kependudukan', to: '/admin/residents' },
              },
              {
                step: 2,
                title: 'Isi Identitas & Tautkan / Buat Rumah Baru',
                description: 'Lengkapi Nama Lengkap, NIK, No KK. Di pilihan rumah, Anda bisa memilih rumah yang ada atau klik "+ Buat Rumah Baru" secara instan.',
              },
              {
                step: 3,
                title: 'Akun Portal Otomatis Terhubung',
                description: 'Jika warga ditandai sebagai Kepala Keluarga, sistem otomatis menyinkronkan kepala keluarga ke rumah dan akun portal langsung aktif.',
              },
            ],
          },
        ],
      },
      {
        slug: 'stiker-qr-dan-reset-pin-rumah',
        title: 'Cetak Stiker QR Rumah & Reset PIN Mandiri',
        category: 'Kependudukan & Rumah QR',
        badge: 'Fitur Utama',
        readTime: '3 menit',
        excerpt: 'Membuat token QR rumah untuk klaim mandiri warga, login portal rumah tangga, dan cara mereset PIN.',
        sections: [
          {
            heading: 'Fungsi Stiker QR Rumah Tangga',
            content: [
              'Setiap rumah di lingkungan RT memiliki kode QR unik yang dapat dicetak dan ditempel di depan pintu/pagar rumah.',
              'Kode QR ini berfungsi khusus bagi warga untuk klaim akses rumah tangga secara mandiri di HP tanpa perlu login rumit. Petugas bank sampah mencatat setoran langsung melalui daftar nama warga/rumah di modul Bank Sampah.',
            ],
            callout: {
              type: 'warning',
              title: 'Perhatian Reset Token',
              message: 'Jika stiker QR hilang atau disalahgunakan, Admin RT dapat mengklik "Regenerate Token". Stiker lama otomatis tidak dapat digunakan lagi.',
            },
            steps: [
              {
                step: 1,
                title: 'Buka Menu Data Rumah',
                description: 'Masuk ke menu Rumah & Akses QR di sidebar admin.',
                actionLink: { label: 'Buka Data Rumah & QR', to: '/admin/houses' },
              },
              {
                step: 2,
                title: 'Cetak Stiker QR Lembar RT',
                description: 'Gunakan tombol "Cetak Stiker QR" untuk mencetak lembar stiker QR seluruh rumah siap tempel.',
              },
              {
                step: 3,
                title: 'Reset PIN 4 Digit Rumah',
                description: 'Jika warga lupa PIN autentikasi rumahnya, Admin RT dapat menekan tombol "Reset PIN" untuk menerbitkan PIN baru secara instan.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'keuangan',
    name: '3. Keuangan & Multi-Fund RT',
    description: 'Arus kas transparan, multi-kantong dana, verifikasi iuran, dan ekspor laporan.',
    iconName: 'Wallet',
    articles: [
      {
        slug: 'setup-kantong-kas-multi-fund',
        title: 'Konsep Multi-Kantong Kas (Multi-Fund)',
        category: 'Keuangan & Multi-Fund RT',
        badge: 'Keuangan',
        readTime: '5 menit',
        excerpt: 'Memisahkan likuiditas kas operasional, sosial/kematian, kepemudaan, dan pembangunan fasilitas fisik.',
        sections: [
          {
            heading: 'Pemisahan Likuiditas Dana RT',
            content: [
              'Sistem Sitransparan menerapkan model multi-kantong kas (Multi-Fund) sehingga dana RT tidak bercampur dalam satu rekening tanpa kejelasan alokasi.',
              'Secara default terdapat 1 Kantong Kas Utama (Operasional RT). Admin dapat menambahkan kantong kas khusus seperti Kas Sosial, Kas Pemuda, dan Kas Pembangunan.',
            ],
            steps: [
              {
                step: 1,
                title: 'Masuk ke Tab 3 Pengaturan Kas',
                description: 'Buka menu Keuangan RT, lalu pilih Tab 3: Pengaturan Pos & Kantong Kas.',
                actionLink: { label: 'Buka Keuangan RT', to: '/admin/financial' },
              },
              {
                step: 2,
                title: 'Tambah Kantong Kas Baru',
                description: 'Klik "Tambah Kantong Kas", tentukan nama kas, tipe dana (Operasional / Sosial / Pemuda / Pembangunan), dan pilih PIC Penanggung Jawab.',
              },
              {
                step: 3,
                title: 'Gunakan saat Transaksi',
                description: 'Setiap kali mencatat transaksi kas masuk atau keluar, pilih kantong kas tujuan agar mutasi tercatat transparan per pos.',
              },
            ],
          },
        ],
      },
      {
        slug: 'verifikasi-iuran-dan-laporan-kas',
        title: 'Verifikasi Iuran Warga & Ekspor Laporan',
        category: 'Keuangan & Multi-Fund RT',
        badge: 'Rutin',
        readTime: '4 menit',
        excerpt: 'Langkah memverifikasi bukti transfer iuran warga dan mengunduh laporan keuangan resmi CSV/PDF.',
        sections: [
          {
            heading: 'Alur Verifikasi Iuran Warga',
            content: [
              'Warga yang telah membayar iuran secara tunai atau transfer dapat mengunggah bukti bayar di portal warga.',
              'Admin RT bertugas memverifikasi kecocokan nominal dan bukti pembayaran sebelum dana masuk ke rekap kas RT.',
            ],
            steps: [
              {
                step: 1,
                title: 'Periksa Tab Iuran Warga',
                description: 'Buka menu Keuangan RT, pilih Tab 2: Iuran Warga, dan filter status "Menunggu Verifikasi".',
                actionLink: { label: 'Buku Iuran Warga', to: '/admin/financial' },
              },
              {
                step: 2,
                title: 'Validasi Bukti Bayar',
                description: 'Klik bukti transfer untuk melihat gambar/struk. Klik "Verifikasi" jika dana valid, atau "Tolak" disertai alasan jika belum masuk.',
              },
              {
                step: 3,
                title: 'Ekspor Laporan Keuangan Bulanan',
                description: 'Gunakan tombol "Export CSV" atau "Cetak Laporan PDF" di Dashboard untuk pelaporan musyawarah RT.',
                actionLink: { label: 'Buka Dashboard Laporan', to: '/admin' },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kegiatan',
    name: '4. Kegiatan, RAB & Rapat',
    description: 'Manajemen acara lingkungan, penyusunan RAB, upload proposal, dan arsip notulensi rapat.',
    iconName: 'Calendar',
    articles: [
      {
        slug: 'kegiatan-dan-penyusunan-rab',
        title: 'Penyusunan Kegiatan Lingkungan & RAB',
        category: 'Kegiatan, RAB & Rapat',
        badge: 'Perencanaan',
        readTime: '4 menit',
        excerpt: 'Cara membuat agenda kerja RT, menyusun rincian rencana anggaran biaya (RAB), dan mengunggah LPJ.',
        sections: [
          {
            heading: 'Transparansi Anggaran Kegiatan',
            content: [
              'Setiap kepanitiaan acara RT (seperti HUT RI, Kerja Bakti, atau Halalbihalal) dapat menginput rencana anggaran biaya secara rinci.',
              'Warga dapat memantau estimasi anggaran vs realisasi riil secara terbuka di portal agenda RT.',
            ],
            steps: [
              {
                step: 1,
                title: 'Buat Agenda Kegiatan Baru',
                description: 'Buka menu Kegiatan & Rapat, klik "+ Buat Kegiatan Baru", tentukan tanggal dan lokasi.',
                actionLink: { label: 'Menu Kegiatan & Acara', to: '/admin/events' },
              },
              {
                step: 2,
                title: 'Rincikan Anggaran Biaya (RAB)',
                description: 'Klik tombol "RAB" pada kartu kegiatan untuk mengisi daftar pos kebutuhan (konsumsi, panggung, hadiah) beserta estimasi biayanya.',
              },
              {
                step: 3,
                title: 'Unggah Proposal & LPJ Realisasi',
                description: 'Setelah acara selesai, lampirkan link/file Laporan Pertanggungjawaban (LPJ) dan laporan nota pengeluaran.',
              },
            ],
          },
        ],
      },
      {
        slug: 'musyawarah-dan-notulensi-rapat',
        title: 'Musyawarah Warga & Notulensi Keputusan',
        category: 'Kegiatan, RAB & Rapat',
        badge: 'Governance',
        readTime: '3 menit',
        excerpt: 'Mendokumentasikan rapat pengurus, absensi peserta, keputusan bersama, dan daftar tugas (action items).',
        sections: [
          {
            heading: 'Pencatatan Rapat Resmi',
            content: [
              'Modul Rapat mendukung pembatasan visibilitas (Publik untuk rapat warga, Internal untuk rapat pengurus inti, Rahasia untuk rapat khusus).',
            ],
            steps: [
              {
                step: 1,
                title: 'Jadwalkan Rapat',
                description: 'Input judul rapat, tanggal, lokasi musyawarah, dan deskripsi agenda.',
                actionLink: { label: 'Kelola Rapat RT', to: '/admin/meetings' },
              },
              {
                step: 2,
                title: 'Isi Notulensi & Poin Keputusan',
                description: 'Catat hasil kesepakatan musyawarah agar tidak terjadi perdebatan atau miskomunikasi di kemudian hari.',
              },
              {
                step: 3,
                title: 'Tetapkan Action Items & PIC',
                description: 'Tambahkan daftar tugas tindak lanjut dan tugaskan pengurus yang bertanggung jawab.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pemberdayaan',
    name: '5. Pemuda & Bank Sampah',
    description: 'Bagan Karang Taruna, absensi tugas sampah, honorarium, dan timbangan nasabah KK.',
    iconName: 'Flame',
    articles: [
      {
        slug: 'karang-taruna-dan-absensi-petugas',
        title: 'Struktur Karang Taruna & Absensi Petugas Sampah',
        category: 'Pemuda & Bank Sampah',
        badge: 'Pemberdayaan',
        readTime: '4 menit',
        excerpt: 'Penerbitan SK masa bakti pemuda, absensi kehadiran penarikan sampah, dan perhitungan otomatis honor.',
        sections: [
          {
            heading: 'Pemberdayaan Pemuda RT',
            content: [
              'Modul Pemberdayaan RT mengintegrasikan SK kepengurusan Karang Taruna dengan manajemen operasional penarikan sampah warga.',
              'Setiap kehadiran tugas penarikan sampah bernilai honor Rp 5.000 / orang yang tercatat otomatis pada rekap absensi.',
            ],
            steps: [
              {
                step: 1,
                title: 'Buka Tab 3 Petugas & Absensi',
                description: 'Navigasikan ke menu Pemberdayaan RT, klik Tab 3: Petugas & Absensi Sampah.',
                actionLink: { label: 'Buka Tab Absensi Sampah', to: '/admin/karang-taruna' },
              },
              {
                step: 2,
                title: 'Daftarkan Master Petugas Pemuda',
                description: 'Pilih sub-tab "Daftar Petugas Sampah" dan klik "+ Tambah Petugas", tautkan dengan data warga.',
              },
              {
                step: 3,
                title: 'Catat Absensi Pengambilan Sampah',
                description: 'Setiap jadwal penarikan, klik "Catat Absensi Tugas", centang petugas yang hadir, dan simpan.',
              },
            ],
          },
        ],
      },
      {
        slug: 'operasional-bank-sampah-digital',
        title: 'Operasional Bank Sampah Digital & Tabungan KK',
        category: 'Pemuda & Bank Sampah',
        badge: 'Sirkular Ekonomi',
        readTime: '5 menit',
        excerpt: 'Master harga sampah dinamis, pencatatan timbangan setoran per KK, dan pembagian hasil kas pemuda.',
        sections: [
          {
            heading: 'Konsep Bank Sampah RT',
            content: [
              'Warga memilah sampah anorganik (plastik, kardus, logam, minyak jelantah) dan menyetorkannya ke Bank Sampah RT.',
              'Hasil penjualan ke pengepul dibagi transparan antara saldo tabungan buku KK warga dan kas operasional Karang Taruna.',
            ],
            steps: [
              {
                step: 1,
                title: 'Setup Master Kategori Sampah',
                description: 'Buka Bank Sampah Digital, atur harga per kg (Harga Pengepul & Harga Beli Warga).',
                actionLink: { label: 'Buka Bank Sampah Digital', to: '/admin/waste-bank' },
              },
              {
                step: 2,
                title: 'Catat Timbangan Setoran Warga',
                description: 'Pilih nomor rumah/KK nasabah, masukkan jenis sampah dan berat timbangan.',
              },
              {
                step: 3,
                title: 'Cek Buku Tabungan Sampah KK',
                description: 'Saldo tabungan warga bertambah otomatis dan dapat dicairkan saat program penarikan tabungan lingkungan.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'komunikasi',
    name: '6. Komunikasi & Transparansi',
    description: 'Penerbitan pengumuman, tanggapan aspirasi warga, dan voting digital.',
    iconName: 'MessageSquareHeart',
    articles: [
      {
        slug: 'pengumuman-dan-arsip-dokumen',
        title: 'Penerbitan Pengumuman & Dokumen Resmi RT',
        category: 'Komunikasi & Transparansi',
        badge: 'Publikasi',
        readTime: '3 menit',
        excerpt: 'Menerbitkan edaran RT dengan multi-foto, lampiran PDF, serta moderasi komentar warga.',
        sections: [
          {
            heading: 'Penyebaran Informasi Warga',
            content: [
              'Pengumuman resmi RT dapat dipublikasikan untuk konsumsi publik (portal kabar) atau khusus warga terdaftar (residents only).',
              'Sistem mendukung hingga 10 lampiran foto WebP/JPEG dan dokumen PDF resmi.',
            ],
            steps: [
              {
                step: 1,
                title: 'Tulis Kabar Pengumuman Baru',
                description: 'Buka menu Komunikasi & Warga, klik "+ Buat Pengumuman".',
                actionLink: { label: 'Menu Komunikasi Warga', to: '/admin/announcements' },
              },
              {
                step: 2,
                title: 'Pilih Kategori & Izin Komentar',
                description: 'Tentukan kategori (Kegiatan / Pengumuman / Santai) dan aktifkan sakelar komentar jika ingin warga berdiskusi.',
              },
              {
                step: 3,
                title: 'Arsip Dokumen SK & Peraturan RT',
                description: 'Unggah file AD/ART atau surat edaran di tab Dokumen Resmi agar warga dapat mengunduh sewaktu-waktu.',
              },
            ],
          },
        ],
      },
      {
        slug: 'moderasi-aspirasi-dan-polling',
        title: 'Moderasi Aspirasi Warga & Polling Digital',
        category: 'Komunikasi & Transparansi',
        badge: 'Demokrasi RT',
        readTime: '4 menit',
        excerpt: 'Merespon keluhan dan usulan lingkungan warga serta menyelenggarakan pemungutan suara digital.',
        sections: [
          {
            heading: 'Partisipasi Warga Lingkungan',
            content: [
              'Warga dapat mengirimkan aspirasi fasilitas umum secara terbuka maupun anonim melalui portal usulan warga.',
              'Admin RT bertindak sebagai moderator yang memperbarui status pengerjaan (Menunggu → Ditinjau → Diproses → Selesai).',
            ],
            steps: [
              {
                step: 1,
                title: 'Tinjau Aspirasi Lingkungan',
                description: 'Buka tab Aspirasi Warga, baca keluhan atau usulan warga, dan berikan respon resmi pengurus.',
                actionLink: { label: 'Daftar Aspirasi Warga', to: '/admin/aspirations' },
              },
              {
                step: 2,
                title: 'Buat Polling / Voting Warga',
                description: 'Buka tab Polling Digital, buat pertanyaan dan pilihan opsi (2 hingga 6 opsi jawaban).',
                actionLink: { label: 'Buka Polling Warga', to: '/admin/polls' },
              },
              {
                step: 3,
                title: 'Pantau Hasil Suara Transparan',
                description: 'Hasil voting dihitung real-time dan dapat ditutup resmi jika batas waktu musyawarah telah berakhir.',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getAllArticles(): DocArticle[] {
  return adminDocCategories.flatMap((c) => c.articles);
}

export function getArticleBySlug(slug: string): DocArticle | undefined {
  return getAllArticles().find((a) => a.slug === slug);
}
