---
title: "Arsip Laporan Audit & Resolusi Bug"
description: "Rekam jejak historis temuan audit, perbaikan bug, dan eliminasi celah keamanan"
tags:
  - testing
  - qa
  - audit
  - security
---

# 📋 Arsip Laporan Audit & Resolusi Bug

Dokumen ini mendokumentasikan perbaikan terverifikasi terhadap isu teknis dan inkonsistensi kontrak API yang pernah ditemukan.

---

## 1. Resolusi Ketidakcocokan Kontrak API (API Mismatches Fixed)

1. `POST /api/v1/financial/dues/{id}/verify`: Menggantikan metode PATCH lama, menambahkan filter status (`pending`, `verified`, `rejected`), dan sinkronisasi saldo pending di dashboard.
2. `POST /api/v1/financial/upload`: Standardisasi endpoint upload bukti bayar.
3. `PUT /api/v1/aspirations/{id}`: Menggantikan PATCH status lama dan mendukung tanggapan pengurus.
4. `GET, POST, PUT /api/v1/needs`: Memperbaiki path endpoint kebutuhan lingkungan (sebelumnya `/community-needs`).
5. `GET, POST /api/v1/residents/{id}/family`: Standardisasi endpoint anggota keluarga.
6. `GET /api/v1/auth/me`: Pengaktifan kembali endpoint profil aktif pengguna.
7. Double Prefix Fix: Memperbaiki bug axios URL double prefix `/api/v1/api/v1/...` pada rute `/reactions` dan `/polls`.
8. `PUT /api/v1/documents/{id}`: Menambahkan handler pembaruan dokumen (sebelumnya merespons 405).

---

## 2. Resolusi Keamanan Lintas Subdomain & Domain ccTLD

1. **Root Platform Landing (`GET /api/v1/public/tenants`)**: Pengunjung anonim di root domain platform (`https://iscube.web.id/`) dapat melihat daftar RT aktif tanpa dialihkan ke layar login (401 interceptor).
2. **Penanganan ccTLD 3 Bagian (`.web.id`)**: Memperbaiki fungsi redirect fallback 404 agar tidak memotong domain menjadi `.web.id` secara keliru.
3. **Superadmin Cross-Subdomain Audit**: Mengizinkan `superadmin` melakukan audit tanpa pemblokiran pencocokan `tenant_id` pada JWT.
4. **Token Propagation pada Handoff Subdomain**: Menyertakan parameter token sementara saat pengguna berpindah domain untuk melewati batasan sandbox cookie browser.

---

## 3. Hubungan Lintas Dokumen

- [[04-api-contracts/api-inventory|Inventaris Endpoint API Terkini]]
- [[06-testing-qa/e2e-playwright-suite|E2E Test Suite]]
- [[00-MOC|Kembali ke MOC]]
