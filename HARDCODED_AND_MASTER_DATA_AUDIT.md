# Analisis Hardcoded Data & Rekomendasi Master Data — Sitransparan RT/RW

Dokumen pemetaan nilai hardcoded saat ini, strategi konfigurasi dinamis (*configurable*), dan pemisahan data master agar sistem mudah di-maintain dan scalable antar-tenant/lingkungan.

---

## 1. Temuan Hardcoded & Kategori Permasalahan

### A. Kategori Transaksi Kas (Finance)
- **Lokasi:** `frontend/src/components/TransactionModal.tsx`
- **Nilai Hardcoded:**
  - Pemasukan: `IURAN_WARGA`, `DONASI`, `DANA_DESA`, `LAINNYA_PEMASUKAN`
  - Pengeluaran: `OPERASIONAL_RT`, `KEBERSIHAN`, `KEGIATAN_WARGA`, `PERBAIKAN_FASILITAS`, `LAINNYA_PENGELUARAN`
- **Masalah:** Setiap RT memiliki pos anggaran dan struktur nama mata anggaran berbeda (misal ada RT yang punya pos *Jimpitan*, *Posyandu*, *Peringatan HUT RI*, *Kematian/Santunan*).
- **Rekomendasi:** Ubah menjadi **Master Data Kategori Transaksi** per tenant (CRUD oleh Admin RT).

### B. Kategori & Tarif Iuran Warga (Fee Categories)
- **Status:** Tabel `fee_categories` sudah ada di database, tetapi **belum ada UI** untuk Admin RT menambah/mengedit jenis iuran (misal: Iuran Sampah, Iuran Keamanan, Iuran Kas Warga).
- **Masalah:** Saat ini sistem hanya mengandalkan seeding default `Iuran Warga` Rp 50.000.
- **Rekomendasi:** Tambahkan menu/halaman **Master Data Iuran** di dashboard Admin RT agar nominal dan periode (bulanan/insidental) fleksibel per unit rumah/lingkungan.

### C. Kategori Dokumen RT & Aspirasi
- **Lokasi:**
  - Dokumen: `frontend/src/components/DocumentUploadModal.tsx` (`financial_report`, `minutes`, `letter`, `other`)
  - Aspirasi: `frontend/src/components/AspirationFormModal.tsx` (`suggestion`, `complaint`, `question`)
  - DB Constraint: `CHECK (category IN (...))` di PostgreSQL
- **Masalah:** Penambahan jenis dokumen baru (misal *SK Pengurus*, *Formulir Surat Pengantar*, *Proposal*) membutuhkan perubahan DDL migration dan frontend code.
- **Rekomendasi:** Jadikan tabel referensi atau lookup configurable tanpa hardcoded check constraint kaku di level DB.

### D. Hubungan Keluarga (Family Relations) & Jenis Kelamin
- **Lokasi:** `frontend/src/components/FamilyMemberModal.tsx`
- **Nilai Hardcoded:** `Istri`, `Suami`, `Anak`, `Orang Tua`, `Lainnya`
- **Analisis:** Cukup representatif standar Dukcapil (bisa dipertahankan sebagai konstanta enum standar atau dibuat master relasi keluarga).

### E. Struktur Panitia & Seksi Event
- **Lokasi:** `backend/internal/domain/event.go` & `frontend/src/pages/EventsPage.tsx`
- **Nilai Hardcoded:** Contoh seksi panitia `Ketua Panitia`, `Bendahara`, `Sekretaris`, `Seksi Konsumsi`, `Seksi Dokumentasi`.
- **Rekomendasi:** Buat template seksi/jabatan yang bisa ditambah dinamis oleh Admin RT saat membuat kepanitiaan acara.

---

## 2. Rencana Pemisahan: Master Data vs Config vs Constant

| Entitas / Variabel | Tipe Saat Ini | Rekomendasi Arsitektur | Pengelola |
|---|---|---|---|
| Domain Dasar & Subdomain | Env Var (`TENANT_BASE_DOMAIN`) | Tetap Env Var | DevOps / Infra |
| JWT Secret & Crypto Keys | Env Var | Tetap Env Var | DevOps / Infra |
| Rate Limiting Quota | Env Var (`RATE_LIMIT_*`) | Tetap Env Var | DevOps / Infra |
| **Kategori Iuran & Tarif** | Seed DB (tanpa UI) | **Master Data Tenant (Tabel & UI)** | Admin RT |
| **Kategori Transaksi Kas** | Hardcode Frontend | **Master Data Tenant (Tabel & UI)** | Admin RT |
| **Kategori Dokumen RT** | Hardcode Frontend + DB CHECK | **Master Data Lookup Table** | Admin RT / Platform |
| **Kategori Aspirasi** | Enum DB + Frontend | **Master Data / Enum Standar** | Platform |
| **Daftar Role Hak Akses** | Table `roles` (Global) | **Master Data Global (Public Schema)** | Superadmin |
| Status Alur Kerja (Workflow) | Const Enum (`pending`, `verified`, `approved`) | Tetap Enum Standar | Developer |

---

## 3. Tahapan Implementasi Master Data

1. **Sprint 1 (Prioritas Tinggi - Finance):**
   - Buat UI manajemen `fee_categories` di halaman Keuangan.
   - Buat tabel `transaction_categories` di schema tenant dan sambungkan dengan modal pencatatan transaksi kas.
2. **Sprint 2 (Prioritas Sedang - Operasional RT):**
   - Buat tabel `document_categories` untuk custom folder/tipe arsip RT.
   - Tambahkan template peran kepanitiaan acara RT yang bisa disesuaikan per event.
