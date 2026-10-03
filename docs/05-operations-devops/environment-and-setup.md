---
title: "Lingkungan & Konfigurasi Sistem"
description: "Pengaturan environment variable, MinIO S3, koneksi PostgreSQL, dan pemetaan port"
tags:
  - operations
  - devops
  - environment
  - configuration
---

# ⚙️ Lingkungan & Konfigurasi Sistem

SiTransparan RT/RW beroperasi menggunakan konfigurasi berbasis Twelve-Factor App melalui environment variables.

---

## 1. Daftar Variabel Lingkungan Utama

| Variabel | Default Dev | Contoh Produksi | Deskripsi |
|---|---|---|---|
| `PORT` | `8080` | `8080` | Port listening HTTP server backend Go |
| `DATABASE_URL` | `postgres://user:pass@postgres:5432/sitransparan_db?sslmode=disable` | `postgres://...` | Connection string PostgreSQL |
| `JWT_SECRET` | `secret123` | *256-bit random hex* | Kunci rahasia signing JWT HS256 |
| `ENCRYPTION_KEY` | `passphrasewhichneedstobe32bytes!` | *32-byte secret* | Kunci AES-256-GCM enkripsi NIK |
| `HMAC_SECRET_KEY` | `hmacsecretkey12345678901234567` | *Secret key* | Kunci HMAC blind-index NIK |
| `TENANT_BASE_DOMAIN` | `openrt.local` | `iscube.web.id` | Base domain untuk resolusi wildcard subdomain |
| `MINIO_ENDPOINT` | `minio:9000` | `s3.provider.com` | Host endpoint S3 storage |
| `MINIO_BUCKET` | `sitransparan-files` | `sitransparan-files` | Bucket S3 penyimpanan berkas |
| `MINIO_PUBLIC_URL`| `http://localhost:9000` | `https://s3.iscube.web.id` | Base URL publik download berkas MinIO |
| `VAPID_PUBLIC_KEY` | *(kunci demo)* | *(kunci produksi)* | Kunci publik Web Push VAPID |
| `VAPID_PRIVATE_KEY`| *(kunci demo)* | *(kunci produksi)* | Kunci privat Web Push VAPID |

---

## 2. Inisialisasi Object Storage (MinIO S3)

Aplikasi secara otomatis memverifikasi keberadaan bucket `sitransparan-files` saat startup backend:
- Jika bucket belum ada, backend membuatnya via MinIO client.
- Mengatur *Public Download Policy* (read-only untuk publik) pada direktori lampiran berita dan dokumen.
- Berkas disimpan dengan struktur hierarki tenant:
  `sitransparan-files/<tenant-slug>/<kategori>/<uuid>-<filename>`

---

## 3. Hubungan Lintas Dokumen

- [[05-operations-devops/docker-and-traefik|Docker & Traefik v3.6]]
- [[05-operations-devops/sdlc-and-promotion-workflow|SDLC & Promosi Kode]]
- [[00-MOC|Kembali ke MOC]]
