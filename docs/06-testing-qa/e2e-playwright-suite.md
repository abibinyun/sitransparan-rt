---
title: "Suite Pengujian E2E Playwright"
description: "Arsitektur 65+ pengujian browser Playwright untuk multi-tenant, peran, dan modul bisnis"
tags:
  - testing
  - e2e
  - playwright
  - qa
---

# 🎭 Suite Pengujian E2E Playwright

Suite pengujian Playwright memastikan seluruh alur kerja pengguna (warga, pengurus RT, dan platform super admin) berjalan sempurna dari antarmuka peramban nyata.

---

## 1. Perintah Eksekusi Pengujian

```bash
# Mode Headless (Digunakan untuk CI dan verifikasi otomatis)
npx playwright test --config=playwright.headless.config.ts

# Mode Headed (Visual browser dengan slowMo untuk observasi interaktif)
npx playwright test

# Menjalankan spesifik modul bisnis (contoh: keuangan)
npx playwright test tests/e2e/finance/finance.spec.ts
```

---

## 2. Struktur Direktori Pengujian (`tests/e2e/`)

```text
tests/e2e/
├── auth/                       Login, register, switch-tenant
├── public/                     Portal transparansi publik (/kabar, /usulan, /agenda)
├── admin/                      Dashboard metrics, export PDF/CSV
├── residents/                  CRUD warga, approval, kartu keluarga, master rumah
├── finance/                    Multi-kantong kas, penagihan iuran, payment_date
├── waste-bank/                 Timbangan sampah, kalkulasi bagi hasil, tabungan KK
├── karang-taruna/              Struktur kepengurusan, periode masa bakti
├── inventory/                  Peminjaman & pengembalian barang aset
├── meetings/                   Notulen rapat, penegakan visibility confidential
├── announcements/              CRUD berita, multi-attachment gambar & file
├── aspirations/                Alur penanganan saran & kritik warga
├── polls/                      Pembuatan polling dan validasi suara
├── isolation/tenant-isolation.spec.ts  Isolasi mutlak antar tenant via hostname
└── roles/negative-authz.spec.ts Penolakan akses warga ke halaman/API admin
```

---

## 3. Prinsip Penulisan Tes Deterministik

- Menggunakan semantic selectors (`page.getByRole`, `page.getByLabel`, `page.getByText`).
- Dilarang menggunakan delay arbitrer (`page.waitForTimeout(3000)`). Selalu gunakan state-based waiting (`expect(locator).toBeVisible()`).
- Data uji independen: Tes membuat record dengan penamaan timestamp unik (`warga_e2e_<timestamp>@test.local`) untuk mencegah tabrakan data.

---

## 4. Hubungan Lintas Dokumen

- [[06-testing-qa/backend-test-suite|Suite Pengujian Backend Go]]
- [[06-testing-qa/audit-reports-archive|Arsip Laporan Audit & Bugfix]]
- [[00-MOC|Kembali ke MOC]]
