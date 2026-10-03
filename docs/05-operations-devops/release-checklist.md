---
title: "Checklist Rilis Produksi"
description: "Daftar periksa verifikasi mutu sebelum melakukan merger ke branch main dan rilis"
tags:
  - operations
  - devops
  - release
  - checklist
---

# ✅ Checklist Rilis Produksi

Sebelum melakukan merge dari `staging` ke `main` dan deploy produksi, seluruh butir checklist berikut wajib dipenuhi:

- [ ] **1. Backend Clean & Test Lolos**:
  - `cd backend && go build ./... && go vet ./...` (tanpa warning/error)
  - `cd backend && go test ./...` (seluruh unit & security tests pass)
- [ ] **2. Frontend Typecheck & Build Sukses**:
  - `cd frontend && npm run build` (lulus typechecking tanpa peringatan tipe)
  - Ukuran index bundle terkendali (< 150 kB entry chunk).
- [ ] **3. E2E Playwright Suite Lolos**:
  - `npx playwright test --config=playwright.headless.config.ts` (seluruh suite regresi hijau).
- [ ] **4. Migrasi Database Forward-Compatible**:
  - Seluruh file migrasi baru memiliki `.up.sql` dan `.down.sql`.
  - Tidak ada script DDL destruktif (`DROP TABLE`, `DROP COLUMN`) tanpa fase transisi.
- [ ] **5. Proteksi Data**:
  - Konfirmasi bahwa tidak ada script seeder atau reset database yang dijalankan di produksi.
- [ ] **6. Audit Log & Keamanan**:
  - Kunci rahasia produksi (`JWT_SECRET`, `ENCRYPTION_KEY`) tidak ter-commit ke git.
- [ ] **7. Sinkronisasi Obsidian Knowledge Vault (Living Documentation)**:
  - Seluruh penambahan endpoint API baru sudah tercatat di `docs/04-api-contracts/api-inventory.md`.
  - Seluruh file migrasi baru sudah tercatat di `docs/03-database/migrations-history.md`.
  - Dokumen modul terkait di `docs/02-modules/` telah disinkronkan dengan komponen frontend/backend.
  - Verifikasi 0 broken link wikilink dan perbarui node di `docs/Architecture-Map.canvas`.

---

## Hubungan Lintas Dokumen

- [[05-operations-devops/sdlc-and-promotion-workflow|Alur Promosi SDLC]]
- [[06-testing-qa/e2e-playwright-suite|E2E Test Suite]]
- [[00-MOC|Kembali ke MOC]]
