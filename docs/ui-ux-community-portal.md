# Konsep UI/UX Portal Warga Transparansi RT/RW: "Community Feed Experience"

**Status:** Rencana Desain & Panduan Pengembangan
**Revisi:** 3 — ditambah bab Bahasa Visual Anti-AI-Slop & gerbang kualitas berbasis skill (selaras `ANTI-AI-SLOP.md`)
**Tujuan:** Mengubah portal transparansi pasif menjadi aplikasi komunitas aktif yang nyaman, terlibat rutin, dan mudah digunakan seluruh lapisan warga.

> **Gerbang kualitas visual:** setiap pekerjaan UI pada konsep ini wajib lulus
> checklist `ANTI-AI-SLOP.md` (§15) sebelum merge. Prinsip intinya: antarmuka harus
> *terasa didesain khusus untuk produk ini* — hierarki yang disengaja, tanpa
> gradien/pil/badge/ikon dekoratif tanpa alasan, dan setiap keputusan visual punya
> jawaban atas pertanyaan *"kenapa ini lebih baik untuk warga RT ini?"*

---

## 1. Visi Utama

Portal bukan sekadar papan pengumuman digital kaku, melainkan **media sosial warga lingkungan** (*Neighborhood Feed*) yang mengutamakan:

1. Aksesibilitas mudah di ponsel (*Mobile-First*).
2. Transparansi visual yang menarik dan manusiawi.
3. Keterlibatan aktif antar-warga melalui mikro-interaksi sosial yang sehat.
4. Perlindungan data pribadi (UU PDP).

> **Catatan framing:** tujuan produknya adalah *keterlibatan rutin yang sehat* (warga rajin
> mengecek kas, ikut musyawarah, merespon pengumuman), bukan "adiktif" dalam arti retensi
> dopamin medsos. Untuk tool tata kelola, **kepercayaan > waktu-dihabiskan**.

---

## 2. Struktur Akses Data: Publik vs Warga Login vs Pengurus

| Tipe Akses | Cakupan Informasi | Contoh Fitur |
|---|---|---|
| **Publik (Tanpa Login)** | Akuntabilitas umum, agenda terbuka, kebijakan bersama | Total saldo kas bulanan, pengumuman umum, agenda kerja bakti/posyandu, ringkasan keputusan rapat (`visibility=public`), status keluhan lingkungan (anonim). |
| **Warga Terdaftar (Login)** | Partisipasi aktif, transparansi detail, data personal | Rincian transaksi & nota/kuitansi kas RT, status iuran mandiri, RSVP/relawan kegiatan, kirim usulan/voting, tracking PIC tugas rapat. |
| **Pengurus / Admin RT** | Manajemen & data sensitif | Data kependudukan lengkap (NIK/KK), verifikasi iuran, status penunggak, audit log, keluhan berstatus rahasia. |

Prinsip penegakan: batasan ini **harus ditegakkan server-side** (JWT claim + filter query),
tidak cukup menyembunyikan tombol di UI. Preseden yang sudah berjalan: enforcement
`visibility=confidential` pada modul meetings.

---

## 3. Pilar Desain UI/UX Sosmed Warga

### 3.1 Beranda Dinamis (*Kabar Lingkungan Feed*)
- **Timeline Berbasis Hierarki**: Pengumuman, dokumentasi kegiatan, dan pencapaian RT
  dalam satu linimasa — tapi **bukan deretan kartu identik**. Variasikan bobot visual:
  pengumuman resmi lebih menonjol (tipografi + warna semantik), dokumentasi foto berupa
  blok lebar, capaian angka berupa baris ringkas. *(Anti-slop: larang pola "grid 3 kartu
  sama isi + ikon + judul + deskripsi".)*
- **Galeri Foto & Cerita Lapangan**: Dokumentasi gotong royong dan renovasi fasilitas
  disajikan dengan format carousel foto. *(Dependensi keras: object storage aktif — sudah terpenuhi di Fase 0.)*
- **Badge Status Cepat**: Warna semantik + **ikon dari satu keluarga ikon (Lucide)**,
  bukan emoji: `CheckCircle2 Selesai` (hijau), `Loader Sedang Dikerjakan` (kuning),
  `Megaphone Pengumuman Resmi` (netral tebal), `Lightbulb Usulan Warga` (aksen).
  Emoji dilarang sebagai ikon UI — render ikonnya beda di setiap ponsel dan tidak bisa dikontrol kontrasnya.
- **Mikro-Interaksi**: Reaksi ringan untuk apresiasi tanpa memicu komentar terbuka —
  tombol ikon Lucide (`ThumbsUp` Dukung, `Heart` Suka, `HandsClapping` Keren) dengan
  label teks yang bisa dibaca screen reader. *(Tanpa kolom komentar di fase awal = moderasi minimal.)*

> **Aturan reaksi:** reaksi hanyalah salah satu cara memberi feedback; jangan sampai
> setiap kartu memuat deretan tombol reaksi seragam. Tampilkan hanya pada tipe konten
> yang relevan (pengumuman resmi & laporan kas), sesuai prinsip *setiap elemen punya alasan*.

### 3.2 Transparansi Finansial Berbasis Cerita (*Visual Storytelling*)
- **Grafis Visual Ringkas**: Saldo kas dan alokasi dana divisualisasikan dalam bentuk grafik sederhana dan kartu ringkasan (bukan tabel akuntansi kaku).
- **Konteks Pengeluaran Nyata**: Format postingan pengeluaran mengaitkan bukti nota/kuitansi dengan hasil pekerjaan fisik.
- **Batas privasi**: ringkasan publik hanya agregat (saldo masuk/keluar per kategori); nama pembayar individual hanya untuk warga login / admin.

### 3.3 Gamifikasi & Rasa Kepemilikan Komunitas
- **Polling 1-Klik**: Jajak pendapat warga untuk musyawarah cepat (misal: jadwal fogging, penataan jadwal ronda). Wajib identitas warga-login, 1 orang 1 suara (lihat §7).
- **Progress Bar Target**: Tampilan visual pencapaian dana atau partisipasi kerja bakti (misal: `Target Kas Acara: 80% Terkumpul`).
- **Apresiasi Partisipasi**: Badge relawan atau kehadiran musyawarah warga.

### 3.4 Distribusi & Integrasi WhatsApp
- **Shareable Card**: Fitur generate gambar ringkasan pengumuman/laporan kas berukuran ramah WhatsApp untuk dibagikan ke grup RT. *(Implementasi: render canvas/SVG di sisi klien — tidak butuh backend baru. Quick win dengan dampak distribusi terbesar.)*
- **PWA & Web Push Notification**: Notifikasi langsung saat keluhan/aspirasi warga direspon atau diselesaikan pengurus. *(Butuh VAPID keys, consent flow, dan scheduler di backend — fase lanjut.)*

### 3.5 Aksesibilitas & Navigasi Mobile-First
- **Bottom Navigation Bar**: Menu utama di bawah layar ponsel (Beranda, Kas RT, Agenda, Usulan, Akun). *(Implikasi: MainLayout internal saat ini berbasis sidebar; ini pekerjaan redesign responsif tersendiri, bukan sekadar komponen baru.)*
- **Tipografi Bersahabat**: Ukuran teks dan kontras warna yang nyaman untuk bapak/ibu lanjut usia — target minimal WCAG AA (kontras ≥ 4.5:1, teks utama ≥ 16px).
- **PWA Cepat & Offline-Friendly**: Cache halaman penting agar tetap bisa diakses saat koneksi internet lambat.

---

## 4. Bahasa Visual & Gerbang Anti-AI-Slop

Bab ini mencegah portal berubah menjadi "dashboard SaaS generik hasil AI". Selaras
`ANTI-AI-SLOP.md`: *intentionality over decoration* — setiap keputusan visual harus
bisa dijustifikasi dari konteks produk (tata kelola RT/RW Indonesia, pengguna lintas
usia, kepercayaan terhadap uang warga).

### 4.1 Arah Desain (Product Character)

**"Institusional lingkungan yang hangat"** — terasa seperti kantor RT yang rapi dan
ramah, bukan startup fintech dan bukan panel admin korporat:

- Netral tenang sebagai dasar (slate/zinc), **satu warna aksen saja** untuk identitas
  (kandidat: emerald — berasosiasi kas sehat & transparansi; saturasi < 80%).
- Warna semantik dipakai hanya untuk makna: hijau = masuk/berhasil, rose = keluar/ditolak,
  amber = menunggu verifikasi. **Larangan**: gradien ungu-biru ala AI, glow neon,
  glassmorphism tanpa fungsi.
- Tipografi dengan karakter, bukan default Inter: kandidat kuat **Plus Jakarta Sans**
  (buatan desainer Indonesia — identitas lokal yang jujur) + angka `tabular-nums`
  untuk semua nominal Rupiah agar kolom kas lurus rapi. Teks utama ≥ 16px demi
  pembaca lanjut usia.

### 4.2 Bentuk, Elevasi & Motion

| Token | Aturan | Alasan |
|---|---|---|
| Radius | HIERARKI, bukan seragam: kontainer besar `rounded-xl`, kontrol `rounded-md`, badge `rounded-full` | Semua elemen sama-bulat = tidak ada hierarki bentuk |
| Shadow | Maksimal 2 level (resting & raised/dialog); andalkan border tipis + kontras latar | Bayangan di mana-mana = visual noise |
| Border | Default 1px netral; border berwarna hanya untuk status | Border warna acak = polusi |
| Motion | 3 durasi (instan/fast/standard), hanya `transform`+`opacity`, hormati `prefers-reduced-motion` | Motion harus mengkomunikasikan perubahan state, bukan dekorasi |

### 4.3 Larangan Eksplisit (deteksi slop)

- ❌ Grid kartu identik 3–6 kolom untuk konten yang bobotnya berbeda
- ❌ Ikon dekoratif pengisi ruang kosong; emoji sebagai ikon UI
- ❌ Gradien karena "halaman terasa kosong"
- ❌ Badge/pill berlebihan — satu kartu maksimal satu badge status
- ❌ Kartu sebagai solusi default semua pengelompokan — kadang whitespace & garis pemisah lebih jujur
- ❌ Layout semuanya center; konten operasional left-aligned
- ❌ Nominal Rupiah pakai font proporsional biasa (angka bergoyang)

### 4.4 UX States Wajib per Interaksi

Setiap fitur baru wajib mendefinisikan 9 state sebelum koding: **default, loading,
empty, error, success, disabled, destructive (aksi bahaya), permission (akses ditolak),
mobile**. Preseden buruk yang sudah kita alami sendiri: modal RSVP & RAB menutup diam
tanpa feedback sukses — persis jenis lubang UX yang bab ini larang.

### 4.5 Skill sebagai Alat Verifikasi (terpasang di `.opencode/skills/`)

| Tahapan kerja | Skill yang dipakai | Fungsinya |
|---|---|---|
| Definisi arah visual & komponen baru | `frontend-design`, `design-taste-frontend` | Memaksa arah spesifik-produk, melarang klise AI |
| Pemilihan style/palette/pairing | `ui-ux-pro-max` | Database style/palette/font pairable dengan konteks |
| Implementasi komponen | `shadcn`, `vercel-composition-patterns` | Komposisi bersih di atas primitif existing, anti boolean-prop explosion |
| Performa implementasi React | `vercel-react-best-practices` | Anti waterfall fetch, bundle, re-render |
| Audit sebelum merge | `web-design-guidelines` + checklist `ANTI-AI-SLOP.md` §15 | Temuan format `file:line`, gate merge |

Urutan prioritas saat skill saling bertentangan mengikuti `ANTI-AI-SLOP.md`:
kebutuhan produk → identitas brand → kejelasan UX → aksesibilitas → hierarki visual → konsistensi → arsitektur React → performa → eksperimen estetika.

---

## 5. Metrik Sukses (KPI)

Fitur interaktivitas tidak boleh dieksekusi tanpa cara mengukurnya. Target setelah 3 bulan pasca-rilis tiap fase:

| Metrik | Definisi | Target Awal |
|---|---|---|
| **MAU warga** | Warga unik login ≤ 30 hari / total warga terdaftar | ≥ 40% |
| **Feed engagement** | Rata-rata reaksi per postingan pengumuman | ≥ 5 |
| **RSVP rate** | Peserta RSVP / total undangan kegiatan | ≥ 25% |
| **Share rate WA** | Kartu dibagikan (event share) / pengumuman tayang | ≥ 10% |
| **Respons aspirasi** | % aspirasi mendapat respon resmi ≤ 7 hari | ≥ 80% |
| **Polling partisipasi** | Voter / warga aktif per polling | ≥ 30% |

Instrumentasi minimal: event analytics sisi server (log tabel `audit_logs` atau tabel
metrik ringan) — hindari third-party tracker demi privasi.

---

## 6. Arsitektur Interaksi Baru (Backend)

Endpoint baru yang diperlukan (semua tenant-scoped, konsisten pola existing):

| Endpoint | Akses | Catatan |
|---|---|---|
| `GET /api/v1/t/{slug}/financial-summary` | Publik | Agregat saja: saldo, pemasukan/pengeluaran bulan berjalan per kategori. **Tidak ada** baris per-pembayar. |
| `GET /api/v1/t/{slug}/meetings` | Publik | Hanya meeting `visibility='public'` (enforcement sudah ada di modul meetings). |
| `POST /api/v1/t/{slug}/reactions` | Warga login | Body: `{target_type, target_id, reaction}`. Unik per (user, target). |
| `POST /api/v1/t/{slug}/polls/{id}/vote` | Warga login | 1 warga 1 suara per polling; hasil agregat publik. |

---

## 7. Keamanan & Moderasi

Interaksi sosial membuka permukaan penyalahgunaan baru. Aturan minimum sebelum Fase 3 (interaktivitas) rilis:

1. **Identitas wajib untuk aksi tulis sosial.** Reaksi, voting, dan usulan hanya dari
   akun warga ter-mapping tenant. Tidak ada reaksi anonim (anonimitas tetap tersedia
   khusus untuk aspirasi keluhan, sesuai fitur existing).
2. **Satu identitas satu aksi.** Unique constraint `(user_id, target_id)` untuk reaksi;
   `(user_id, poll_id)` untuk vote. Server-side, bukan cuma disabled tombol di UI.
3. **Rate limit ketat** pada endpoint interaksi (turunkan budget token-bucket khusus,
   misal 20 burst / 5 rps per IP — selaras endpoint auth).
4. **Ukuran & tipe file dibatasi** pada semua upload (maks ~5 MB; whitelist
   image/pdf) — melindungi bucket storage dari abuse.
5. **Moderasi konten usulan**: admin dapat menolak/menyembunyikan usulan yang melanggar
   (fitur existing `status` aspirasi sudah mencakup ini; pastikan feed publik hanya
   menampilkan item berstatus layak-tayang).
6. **Privasi gambar warga**: foto dokumentasi kegiatan yang memuat wajah warga hanya
   tayang jika admin menandai `publishable`; objek sensitif (KTP/KK) **tidak pernah**
   masuk feed publik dan disimpan dengan prefix terpisah.
7. **Audit trail**: setiap aksi moderasi admin tercatat di `audit_logs`.

---

## 8. Dependensi & Estimasi Effort

Urutan eksekusi disusun ulang berdasarkan dependensi nyata (bukan sekadar nomor fase):

```text
Fase 0 — PRASYARAT (selesai ✅)
  Integrasi MinIO sungguhan di local dev Docker: bucket auto-provision,
  upload nyata (proof iuran, dokumen, kuitansi), objek ber-prefix per tenant,
  URL objek dapat diakses. Tanpa ini, galeri foto & storytelling mustahil.

Fase 1 — QUICK WIN (estimasi: 3–5 hari kerja)
  • GET /t/{slug}/meetings  (filter visibility=public — murah, fondasi sudah ada)
  • GET /t/{slug}/financial-summary (agregat publik)
  • Shareable card WhatsApp (client-side canvas)
  → Nilai tertinggi per effort; tidak menambah fitur sosial baru.

Fase 2 — FEED TIMELINE (estimasi: 1–2 minggu)
  • Komponen FeedCard, badge status, BottomNav + responsive MainLayout
  • Restrukturisasi portal publik eksisting menjadi timeline
  • Galerinya mengisi dari objek MinIO yang publishable
  → Gerbang visual §4 wajib: arah desain dikunci via frontend-design +
    design-taste-frontend SEBELUM koding; audit web-design-guidelines +
    checklist ANTI-AI-SLOP.md sebelum merge.

Fase 3 — INTERAKTIVITAS SOSIAL (estimasi: 2–3 minggu)
  • Reaksi warga-login (tabel reactions + unique constraint)
  • Polling 1-klik (tabel polls/poll_votes)
  • Rate limit ketat + audit trail (bab §7 wajib lulus review)

Fase 4 — NOTIFIKASI & GAMIFIKASI (estimasi: 2–3 minggu)
  • Web Push (VAPID, consent, scheduler reminder LPJ/aspirasi)
  • Badge partisipasi & progress bar target dana
```

Estimasi adalah untuk 1 engineer full-stack dengan suite E2E sebagai jaring pengaman;
regresi tiap fase wajib hijau sebelum merge (disiplin trunk yang sudah berjalan).

---

## 9. Rencana Implementasi Bertahap (ringkas)

1. **Fase Desain & Komponen**: `FeedCard`, `ReactionButton`, `VisualStatWidget`, `BottomNav`
   — dirancang lewat gerbang §4.5 (`frontend-design` + `design-taste-frontend` untuk arah,
   audit `web-design-guidelines` sebelum merge).
2. **Fase Integrasi Endpoint Publik**: `financial-summary`, `meetings` publik (§6).
3. **Fase Interaktivitas & Sosmed**: reaksi, polling instan, kartu preview WhatsApp —
   dengan gerbang keamanan §7.
