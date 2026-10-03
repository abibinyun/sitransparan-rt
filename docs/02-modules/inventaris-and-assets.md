---
title: "Modul Inventaris & Aset RT"
description: "Master barang inventaris lingkungan, siklus peminjaman warga, dan pelacakan kondisi barang"
tags:
  - module
  - inventory
  - assets
  - logistics
---

# 📦 Modul Inventaris & Aset RT

Modul Inventaris mengelola barang milik rukun tetangga (seperti tenda terop, kursi plastik, sound system, mesin fogging, tangga lipat) dan alur peminjaman warga.

---

## 1. Pemetaan Arsitektur Kode Sumber

- **Domain Entities**: `backend/internal/domain/inventory.go`
- **Database Tables**:
  - `tenant_<slug>.inventory_items` (master barang aset)
  - `tenant_<slug>.inventory_borrowings` (transaksi peminjaman dan pengembalian)
- **Repository**: `backend/internal/repository/inventory_repository.go`
- **Usecase**: `backend/internal/usecase/inventory_usecase.go`
- **HTTP Delivery**: `backend/internal/delivery/http/inventory_handler.go`
- **Frontend Page & Components (Modular)**:
  - `frontend/src/pages/InventoryPage.tsx`
  - `frontend/src/components/inventory/InventoryItemsTab.tsx` (Tab master aset barang)
  - `frontend/src/components/inventory/InventoryBorrowingsTab.tsx` (Tab peminjaman aktif & riwayat)
  - `frontend/src/components/inventory/InventoryItemModal.tsx` (Modal tambah/edit aset)
  - `frontend/src/components/inventory/InventoryBorrowModal.tsx` (Modal pengajuan pinjam)
  - `frontend/src/components/inventory/InventoryReturnModal.tsx` (Modal konfirmasi barang kembali)
- **E2E Tests**: `tests/e2e/inventory/inventory.spec.ts`

---

## 2. Fitur & Logika Bisnis Utama

### A. Master Barang Inventaris
- Setiap aset memiliki kode unik (`item_code`), nama barang, kategori, total kuantitas (`total_quantity`), kuantitas tersedia (`available_quantity`), dan kondisi fisik (`good`, `damaged`, `in_repair`).
- Foto barang disimpan ke MinIO S3 dan dihubungkan via URL.

### B. Validasi Kuantitas Peminjaman
Saat warga mengajukan peminjaman:
1. Sistem memverifikasi: `borrow_quantity <= available_quantity`.
2. Jika valid, status peminjaman menjadi `borrowed` dan `available_quantity` dikurangi secara atomik.
3. Saat barang dikembalikan (`InventoryReturnModal`), admin mencatat kondisi pengembalian (baik atau rusak). `available_quantity` dikembalikan dan status menjadi `returned`.

---

## 3. Hubungan Lintas Dokumen

- [[02-modules/kependudukan-and-houses|Verifikasi Peminjam Berbasis Warga]]
- [[00-MOC|Kembali ke MOC]]
