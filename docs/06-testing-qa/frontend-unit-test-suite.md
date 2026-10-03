---
title: "Suite Pengujian Unit Frontend (Vitest)"
description: "Arsitektur unit testing React dan utilitas frontend menggunakan Vitest dan React Testing Library"
tags:
  - testing
  - frontend
  - vitest
  - unit-test
---

# ⚡ Suite Pengujian Unit Frontend (Vitest)

Pengujian unit frontend berjalan di atas **Vitest** dan **React Testing Library** yang terintegrasi secara native dengan konfigurasi Vite tanpa overhead kompilasi eksternal.

---

## 1. Perintah Eksekusi Pengujian

```bash
# Masuk ke direktori frontend
cd frontend

# Menjalankan seluruh pengujian unit frontend (single run)
npm test

# Menjalankan pengujian dalam mode interaktif (watch mode)
npm run test:watch
```

---

## 2. Cakupan Modul yang Diuji

| Berkas Pengujian | Modul Target | Aspek yang Diverifikasi |
|---|---|---|
| `src/store/__tests__/useAuthStore.test.ts` | `useAuthStore` | Penyimpanan token, refresh token, role, isolasi prefix lingkungan (`dev_`, `staging_`), dan pembersihan total saat logout |
| `src/services/__tests__/api.test.ts` | `services/api.ts` | Injeksi Authorization Bearer token dan mekanisme antrean silent refresh token saat menerima HTTP 401 |
| `src/utils/__tests__/formatRupiah.test.ts` | `formatRupiah` | Pemformatan nominal mata uang Rupiah Indonesia (Rp), angka nol, dan nominal besar jutaan |
| `src/utils/__tests__/date.test.ts` | `utils/date.ts` | Formatter tanggal bahasa Indonesia (WIB), jam & menit, fallback aman string invalid |
| `src/utils/__tests__/tenant.test.ts` | `utils/tenant.ts` | Resolusi subdomain tenant, filter hostname platform, pembangunan URL platform |
| `src/data/adminDocsData.test.ts` | `data/adminDocsData.ts` | Integritas data buku panduan admin RT |
| `src/components/ShareCardModal.test.ts`| `ShareCardModal` | Format teks share WhatsApp dan media sosial untuk transparansi kas RT |

---

## 3. Hubungan Lintas Dokumen

- [[06-testing-qa/backend-test-suite|Suite Pengujian Backend Go]]
- [[06-testing-qa/e2e-playwright-suite|Suite E2E Playwright Browser]]
- [[00-MOC|Kembali ke MOC]]
