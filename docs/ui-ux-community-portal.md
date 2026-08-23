# Konsep UI/UX Portal Warga Transparansi RT/RW: "Community Feed Experience"

**Status:** Rencana Desain & Panduan Pengembangan
**Revisi:** 2 — ditambah bab Metrik Sukses, Keamanan & Moderasi, Dependensi & Effort
**Tujuan:** Mengubah portal transparansi pasif menjadi aplikasi komunitas aktif yang nyaman, terlibat rutin, dan mudah digunakan seluruh lapisan warga.

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
- **Card-Based Timeline**: Pengumuman, dokumentasi kegiatan, dan pencapaian RT muncul seperti linimasa medsos.
- **Galeri Foto & Cerita Lapangan**: Dokumentasi gotong royong dan renovasi fasilitas disajikan dengan format carousel foto. *(Dependensi keras: object storage aktif — lihat §7.)*
- **Badge Status Cepat**: Label warna tegas (`🟢 Selesai`, `🟡 Sedang Dikerjakan`, `📢 Pengumuman Resmi`, `💡 Usulan Warga`).
- **Mikro-Interaksi**: Reaksi ringan (👍 Dukung, ❤️ Suka, 👏 Keren) untuk memberi apresiasi tanpa memicu komentar terbuka. *(Tanpa kolom komentar di fase awal = moderasi minimal.)*

### 3.2 Transparansi Finansial Berbasis Cerita (*Visual Storytelling*)
- **Grafis Visual Ringkas**: Saldo kas dan alokasi dana divisualisasikan dalam bentuk grafik sederhana dan kartu ringkasan (bukan tabel akuntansi kaku).
- **Konteks Pengeluaran Nyata**: Format postingan pengeluaran mengaitkan bukti nota/kuitansi dengan hasil pekerjaan fisik.
- **Batas privasi**: ringkasan publik hanya agregat (saldo masuk/keluar per kategori); nama pembayar individual hanya untuk warga login / admin.

### 3.3 Gamifikasi & Rasa Kepemilikan Komunitas
- **Polling 1-Klik**: Jajak pendapat warga untuk musyawarah cepat (misal: jadwal fogging, penataan jadwal ronda). Wajib identitas warga-login, 1 orang 1 suara (lihat §6).
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

## 4. Metrik Sukses (KPI)

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

## 5. Arsitektur Interaksi Baru (Backend)

Endpoint baru yang diperlukan (semua tenant-scoped, konsisten pola existing):

| Endpoint | Akses | Catatan |
|---|---|---|
| `GET /api/v1/t/{slug}/financial-summary` | Publik | Agregat saja: saldo, pemasukan/pengeluaran bulan berjalan per kategori. **Tidak ada** baris per-pembayar. |
| `GET /api/v1/t/{slug}/meetings` | Publik | Hanya meeting `visibility='public'` (enforcement sudah ada di modul meetings). |
| `POST /api/v1/t/{slug}/reactions` | Warga login | Body: `{target_type, target_id, reaction}`. Unik per (user, target). |
| `POST /api/v1/t/{slug}/polls/{id}/vote` | Warga login | 1 warga 1 suara per polling; hasil agregat publik. |

---

## 6. Keamanan & Moderasi

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

## 7. Dependensi & Estimasi Effort

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

Fase 3 — INTERAKTIVITAS SOSIAL (estimasi: 2–3 minggu)
  • Reaksi warga-login (tabel reactions + unique constraint)
  • Polling 1-klik (tabel polls/poll_votes)
  • Rate limit ketat + audit trail (bab §6 wajib lulus review)

Fase 4 — NOTIFIKASI & GAMIFIKASI (estimasi: 2–3 minggu)
  • Web Push (VAPID, consent, scheduler reminder LPJ/aspirasi)
  • Badge partisipasi & progress bar target dana
```

Estimasi adalah untuk 1 engineer full-stack dengan suite E2E sebagai jaring pengaman;
regresi tiap fase wajib hijau sebelum merge (disiplin trunk yang sudah berjalan).

---

## 8. Rencana Implementasi Bertahap (ringkas)

1. **Fase Desain & Komponen**: `FeedCard`, `ReactionButton`, `VisualStatWidget`, `BottomNav`.
2. **Fase Integrasi Endpoint Publik**: `financial-summary`, `meetings` publik (§5).
3. **Fase Interaktivitas & Sosmed**: reaksi, polling instan, kartu preview WhatsApp —
   dengan gerbang keamanan §6.
