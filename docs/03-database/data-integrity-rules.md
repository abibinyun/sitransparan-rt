---
title: "Aturan Integritas Data & Proteksi Sistem"
description: "Kebijakan proteksi database, immutability transaksi, isolasi data, dan kepatuhan hukum"
tags:
  - database
  - security
  - compliance
  - integrity
---

# 🛡️ Aturan Integritas Data & Proteksi Sistem

SiTransparan RT/RW beroperasi berdasarkan prinsip integritas data yang kokoh untuk mencegah manipulasi, korupsi anggaran, dan kebocoran data warga.

---

## 1. Lima Prinsip Integritas Utama

### A. Immutability Transaksi Kas (Append-Only)
- Catatan pengeluaran dan pemasukan pada `tenant_<slug>.financial_transactions` bersifat kekal (immutable).
- Tidak ada hak akses maupun endpoint aplikasi untuk `UPDATE` atau `DELETE`.
- Perbaikan kesalahan input wajib dilakukan via transaksi penyesuaian (koreksi).

### B. Soft-Delete Entitas Kritis
- Data warga (`residents`), rumah (`houses`), tenant (`tenants`), dan aset inventaris menggunakan pola soft-delete (`deleted_at TIMESTAMPTZ`).
- Penghapusan tenant oleh Super Admin tidak pernah menghapus skema PostgreSQL secara fisik (`DROP SCHEMA` dilarang).

### C. Isolasi Multi-Tenant Mutlak
- Tidak boleh ada query lintas tenant (`CROSS JOIN tenant_a.table WITH tenant_b.table`).
- Resolusi nama tabel wajib melalui fungsi pembungkus `TenantTable(ctx, "table")`.
- Identitas tenant diturunkan secara mutlak dari token JWT yang telah diverifikasi signature-nya. Header HTTP bebas seperti `X-Tenant-ID` tidak pernah dipercaya sebagai bukti kepemilikan data.

### D. Enkripsi Data Pribadi (UU PDP)
- Seluruh Nomor Induk Kependudukan (NIK) wajib terenkripsi menggunakan AES-256-GCM saat disimpan ke database.
- Key enkripsi (`ENCRYPTION_KEY`) dan key HMAC (`HMAC_SECRET_KEY`) dikonfigurasi melalui environment variable rahasia dan tidak pernah dicatat dalam log aplikasi.

### E. Transaksi Atomik Database
- Operasi multi-tabel (misal: catat setoran bank sampah + tambah tabungan KK + catat kas pemuda; atau bayar iuran + catat transaksi kas besar) wajib dibungkus dalam blok transaksi database:
  ```go
  tx, err := db.BeginTx(ctx, nil)
  // ... operasi 1
  // ... operasi 2
  // commit atau rollback otomatis jika error
  ```

---

## 2. Hubungan Lintas Dokumen

- [[03-database/schema-inventory|Katalog Skema Database]]
- [[01-architecture/multi-tenancy|Isolasi Multi-Tenancy]]
- [[00-MOC|Kembali ke MOC]]
