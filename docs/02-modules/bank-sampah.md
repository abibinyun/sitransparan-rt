---
title: "Modul Bank Sampah Digital"
description: "Pengelolaan kategori sampah, kalkulasi bagi hasil otomatis warga-pemuda, buku tabungan KK, dan portal publik"
tags:
  - module
  - waste-bank
  - environment
  - community
---

# ♻️ Modul Bank Sampah Digital

Modul Bank Sampah mengintegrasikan kepedulian lingkungan dengan pemberdayaan ekonomi sirkular warga dan kas operasional pemuda/Karang Taruna.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/waste_bank.go`
- **Database Tables**:
  - `tenant_<slug>.waste_categories` (master jenis & harga sampah per kg)
  - `tenant_<slug>.waste_deposits` (header transaksi setoran sampah)
  - `tenant_<slug>.waste_deposit_items` (rincian item per kilogram dan nilai rupiah)
- **Repository**: `backend/internal/repository/waste_bank_repository.go`
- **Usecase**: `backend/internal/usecase/waste_bank_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/waste_bank_handler.go`
- **Frontend Page & Components (Modular)**:
  - `frontend/src/pages/WasteBankPage.tsx`
  - `frontend/src/components/waste-bank/WasteDepositsTab.tsx` (Tab riwayat setoran sampah)
  - `frontend/src/components/waste-bank/WasteHouseholdsTab.tsx` (Tab ringkasan buku tabungan KK)
  - `frontend/src/components/waste-bank/WasteCategoriesTab.tsx` (Tab master jenis & harga)
  - `frontend/src/components/waste-bank/WasteDepositModal.tsx` (Modal pencatatan timbangan)
  - `frontend/src/components/waste-bank/WasteCategoryModal.tsx` (Modal tambah/edit kategori)
  - `frontend/src/components/waste-bank/HouseholdSavingsModal.tsx` (Modal rincian tabungan KK)
- **Public Portal View**: `frontend/src/pages/PublicWasteBankPage.tsx` (`/bank-sampah`)
- **E2E Tests**: `tests/e2e/waste-bank/waste-bank.spec.ts`

---

## 2. Fitur & Logika Bisnis Utama

### A. Master Kategori Sampah Dinamis
- Setiap kategori (misal: *Kardus / Karton*, *Plastik PET Bening*, *Minyak Jelantah*, *Besi / Logam*) memiliki harga per kg dan persentase bagi hasil warga (`resident_share_pct`, default 80%) vs kas pengelola/pemuda (20%).
- Status `is_active` mengontrol apakah kategori muncul di form penyetoran.

### B. Rumus Kalkulasi Pembagian Bagi Hasil
Saat admin mencatat penimbangan di `WasteDepositModal`:
$$\text{Nilai Kotor} = \text{Berat (kg)} \times \text{Harga per kg}$$
$$\text{Hak Tabungan Warga} = \text{Nilai Kotor} \times \left(\frac{\text{resident\_share\_pct}}{100}\right)$$
$$\text{Kas Pemuda / Operasional} = \text{Nilai Kotor} - \text{Hak Tabungan Warga}$$

Perhitungan ini disimpan secara terinci per item pada tabel `waste_deposit_items`.

### C. Buku Tabungan Sampah Kepala Keluarga
- Setiap KK yang terdaftar di RT memiliki buku tabungan digital.
- Total saldo tabungan dapat ditarik (*payout/disbursement*) atau dikonversikan langsung untuk pembayaran iuran bulanan RT.

### D. Portal Transparansi Publik Bank Sampah
- Warga umum dapat memantau harga sampah ter-update, total volume sampah terkelola (kg), dan dampak lingkungan di URL `/bank-sampah`.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/kependudukan-and-houses|Data Kepala Keluarga]]
- [[02-modules/karang-taruna-and-structure|Alokasi Kas Bagi Hasil Pemuda]]
- [[02-modules/portal-transparansi-publik|Halaman Publik /bank-sampah]]
- [[00-MOC|Kembali ke MOC]]
