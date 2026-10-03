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

### A. Pengujian Keamanan Lintas Tenant (`security_integration_test.go`)
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
