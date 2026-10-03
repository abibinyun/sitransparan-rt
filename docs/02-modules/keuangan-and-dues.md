---
title: "Modul Keuangan & Kas RT"
description: "Arsitektur multi-kantong kas, buku kas besar append-only, penagihan iuran fleksibel, dan ekspor laporan"
tags:
  - module
  - finance
  - dues
  - ledger
---

# 💰 Modul Keuangan & Kas RT

Modul Keuangan adalah jantung transparansi SiTransparan RT/RW. Modul ini menjamin setiap rupiah uang warga tercatat dengan integritas mutlak tanpa celah pengubahan manipulatif (immutability).

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/financial.go`
- **Database Tables**:
  - `tenant_<slug>.funds` (multi-kantong kas)
  - `tenant_<slug>.fee_categories` (kategori iuran bulanan/insidental)
  - `tenant_<slug>.dues_payments` (pembayaran iuran warga per rumah/KK)
  - `tenant_<slug>.financial_transactions` (buku kas besar)
- **Repository**: `backend/internal/repository/financial_repository.go`
- **Usecase**: `backend/internal/usecase/financial_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/financial_handler.go`
- **Frontend Page & Components (Modular)**:
  - `frontend/src/pages/FinancialPage.tsx` (Container utama & metrics)
  - `frontend/src/components/financial/DuesTab.tsx` (Tab daftar iuran & filter)
  - `frontend/src/components/financial/TransactionsTab.tsx` (Tab mutasi buku kas besar)
  - `frontend/src/components/financial/MasterFundsTab.tsx` (Tab kantong kas & kategori iuran)
  - `frontend/src/components/financial/ResidentDuesHistoryModal.tsx` (Modal riwayat iuran KK)
  - `frontend/src/components/financial/FundModal.tsx`, `CashCategoryModal.tsx`, `FeeCategoryModal.tsx`
  - `frontend/src/components/DuesPaymentModal.tsx` (Modal input pembayaran iuran fleksibel)
- **E2E Tests**: `tests/e2e/finance/finance.spec.ts`, `tests/e2e/finance/rt03-verification.spec.ts`

---

## 2. Fitur & Aturan Bisnis Utama

### A. Multi-Kantong Kas (`funds`)
- Setiap RT dapat memecah kas menjadi beberapa kantong terpisah (misal: *Kas Utama*, *Dana Sosial / Duka*, *Kas Pembangunan / Lapangan*, *Kas Pemuda*).
- Setiap kantong memiliki flag `is_default`. Kantong default digunakan sebagai target otomatis penerimaan iuran warga.
- Fitur **Pindah Kas / Transfer Antar Kantong**: Mencatat mutasi keluar dari kantong sumber dan mutasi masuk ke kantong tujuan secara atomik (`BEGIN ... COMMIT`).

### B. Fleksibilitas Tanggal Pembayaran & Nominal Iuran (Migration 000050)
- **Payment Datetime**: Kolom `payment_date TIMESTAMPTZ` memungkinkan pencatatan historis (backdated) atau pembayaran real-time menggunakan widget `datetime-local` di UI.
- **Editable Dues Amount**: Meskipun kategori iuran memiliki nominal dasar (misal Rp 50.000), admin dapat menyesuaikan nominal secara bebas di modal pembayaran untuk mengakomodasi iuran ruko, tarif ganda, atau denda keterlambatan.

### C. Buku Kas Append-Only (Immutability Ledger)
- Tabel `financial_transactions` adalah buku kas besar yang **tidak dapat diubah atau dihapus**.
- Endpoint `PUT /financial/transactions/{id}` dan `DELETE /financial/transactions/{id}` secara sengaja merespons **HTTP 405 Method Not Allowed**.
- Jika terjadi kesalahan pencatatan, admin harus membuat transaksi koreksi/penyesuaian baru (reversal entry) dengan menyertakan keterangan referensi transaksi sebelumnya.

### D. Ekspor Laporan Finansial Blob
- Mendukung ekspor laporan keuangan dalam format **CSV** dan **PDF** melalui backend stream:
  `GET /api/v1/dashboard/reports/financial/export?format=csv|pdf`
- Laporan menghasilkan ringkasan total saldo, rincian per kantong, dan mutasi debit-kredit terverifikasi.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/kependudukan-and-houses|Relasi Warga & Rumah Pembayar Iuran]]
- [[02-modules/bank-sampah|Integrasi Penjualan Sampah ke Kantong Kas RT]]
- [[03-database/migrations-history|Migrasi 000050: payment_date]]
- [[00-MOC|Kembali ke MOC]]
