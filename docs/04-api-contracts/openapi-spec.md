---
title: "Spesifikasi OpenAPI / Swagger 3.0"
description: "Penyajian spesifikasi OpenAPI terintegrasi dan endpoint swagger UI"
tags:
  - api
  - swagger
  - openapi
  - documentation
---

# 📖 Spesifikasi OpenAPI / Swagger 3.0

Backend Go meng-embed file spesifikasi OpenAPI secara native di dalam binary aplikasi menggunakan fitur `//go:embed` dari Go standard library.

---

## 1. Lokasi Berkas & Penyajian Runtime

- **Lokasi Sumber**: `backend/internal/delivery/http/openapi.yaml`
- **Embedded Variable**:
  ```go
  // backend/internal/delivery/http/swagger.go
  //go:embed openapi.yaml
  var openAPISpec []byte
  ```
- **Endpoint Runtime**:
  - `GET /swagger/openapi.yaml` — Mengembalikan berkas mentah YAML untuk diimpor ke Postman, Insomnia, atau Swagger UI.
  - `GET /swagger/` — Menyajikan antarmuka visual Swagger UI interaktif untuk mencoba API langsung di browser.

---

## 2. Sinkronisasi Kode dengan Spesifikasi

Spesifikasi `openapi.yaml` telah disinkronkan dengan pembaruan fitur terkini:
1. `POST /api/v1/financial/dues/{id}/verify` (menggantikan PATCH lama).
2. `POST /api/v1/financial/upload` dengan `proof_url`.
3. `PUT /api/v1/aspirations/{id}` untuk pembaruan status dan tanggapan.
4. `GET, POST, PUT /api/v1/needs` untuk pengelolaan kebutuhan lingkungan.
5. `GET, POST /api/v1/residents/{id}/family` untuk anggota keluarga.
6. `GET /api/v1/auth/me` untuk profil pengguna aktif.
7. `PUT /api/v1/documents/{id}` untuk pembaharuan arsip berkas.
8. Dukungan field `payment_date` pada skema `DuesPayment`.

---

## 3. Hubungan Lintas Dokumen

- [[04-api-contracts/api-inventory|Inventaris Endpoint API]]
- [[00-MOC|Kembali ke MOC]]
