---
title: "Suite Pengujian Backend Go"
description: "Pengujian unit, integrasi repository, dan verifikasi keamanan lintas-tenant di sisi backend"
tags:
  - testing
  - backend
  - golang
  - security
---

# 🧪 Suite Pengujian Backend Go

Pengujian backend ditulis menggunakan package `testing` standar bawaan Go tanpa framework test pihak ketiga yang berlebihan.

---

## 1. Perintah Eksekusi Pengujian Backend

```bash
# Masuk ke direktori backend
cd backend

# Kompilasi dan validasi statis (Vet)
go build ./... && go vet ./...

# Menjalankan seluruh pengujian unit & integrasi
go test -v ./...

# Menjalankan pengujian spesifik keamanan (Security Integration Test)
go test -v ./internal/delivery/http -run TestSecurity_
```

---

## 2. Cakupan Pengujian Kritis

### A. Pengujian Usecase Bisnis (100% Core Domains)
Setiap modul usecase memiliki berkas pengujian terisolasi (`backend/internal/usecase/*_test.go`):
- `auth_usecase_test.go`: Registrasi, otentikasi login, isolasi role DB mapping, rotasi access/refresh token, dan pencabutan sesi (reuse detection).
- `financial_usecase_test.go`: Mutasi kas besar, transfer antar-kantong kas (`funds`), dan kalkulasi saldo.
- `waste_bank_usecase_test.go`: Pembagian bagi hasil sampah (80% hak tabungan warga vs 20% kas pemuda).
- `waste_attendance_usecase_test.go`: Perhitungan agregasi presensi piket pemuda dan uang lelah / honor per giat.
- `meeting_usecase_test.go`: Penegakan hak akses kerahasiaan musyawarah (`confidential` ditolak untuk warga).
- `event_usecase_test.go`: Pengelolaan anggaran RAPB kegiatan (estimasi vs realisasi).
- `rt_structure_usecase_test.go`: Transisi status masa bakti kepengurusan RT (`active` -> `archived`).
- `inventory_usecase_test.go`: Siklus peminjaman, pengurangan kuantitas stok otomatis, dan pengembalian barang.
- `resident_usecase_test.go`: Alur approval pendaftaran warga baru dan enkripsi NIK.
- `announcement_doc_usecase_test.go`: Publikasi kabar multimedia dan repositori berkas dokumen resmi.
- `aspiration_need_usecase_test.go`: Pelaporan aspirasi anonim dan pengadaan sarana lingkungan.
- `push_usecase_test.go`: Siklus langganan Web Push VAPID browser.
- `health_usecase_test.go`: Healthcheck ketersediaan aplikasi.

### B. Pengujian Keamanan Lintas Tenant (`security_integration_test.go`)
- **Cross-Tenant Read/Write Isolation**: Memverifikasi bahwa token dari `tenant_a` ditolak mentah-mentah saat mencoba membaca atau mengubah data pada `tenant_b`.
- **Role Escalation Protection**: Memverifikasi bahwa user dengan peran `admin_rt` atau `resident` tidak dapat menaikkan perannya menjadi `superadmin`.
- **RBAC Enforcement**: Memverifikasi seluruh endpoint terlindungi dengan kode status HTTP 401 (Unauthenticated) atau HTTP 403 (Unauthorized).

### B. Pengujian Kriptografi (`pkg/crypto`)
- Validasi fungsi enkripsi dan dekripsi NIK AES-256-GCM.
- Validasi konsistensi blind-index HMAC-SHA256.

---

## 3. Hubungan Lintas Dokumen

- [[06-testing-qa/e2e-playwright-suite|Pengujian E2E Browser]]
- [[01-architecture/authentication-and-rbac|Matriks Hak Akses]]
- [[00-MOC|Kembali ke MOC]]
