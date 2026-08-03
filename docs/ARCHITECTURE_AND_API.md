# Dokumentasi Platform Sitransparan RT/RW

Dokumen ini berisi panduan arsitektur, penjelasan API, struktur database, serta alur penggunaan role di **Sitransparan RT**.

---

## 1. Arsitektur Multi-Tenant

Aplikasi menggunakan pola **Row-Level Tenant Isolation** di mana seluruh tabel data yang berhubungan dengan RT memiliki kolom `tenant_id`.

```
                    ┌─────────────────────────┐
                    │    Pengunjung / Warga   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Frontend (Vite)     │
                    │   http://localhost:5173 │
                    └────────────┬────────────┘
                                 │ HTTP / JSON API
                    ┌────────────▼────────────┐
                    │      Backend (Go)       │
                    │   http://localhost:8081 │
                    └──────┬───────────┬──────┘
                           │           │
           ┌───────────────▼┐         ┌▼──────────────┐
           │ PostgreSQL 16  │         │ MinIO Storage │
           │  (Database)    │         │  (Files/PDF)  │
           └────────────────┘         └───────────────┘
```

---

## 2. Penjelasan Role & Hak Akses (RBAC)

1. **`superadmin`**
   - Mengelola pendaftaran RT (Tenant).
   - Akses API `/api/v1/superadmin/tenants`.
   - **Kredensial Default**: `admin@gmail.com` / `admin123`.

2. **`admin_rt`**
   - Mengelola warga (`/api/v1/residents`), transaksi iuran & kas RT (`/api/v1/financial/*`), agenda RT (`/api/v1/events`), serta edaran pengumuman & dokumen.
   - **Kredensial Default**: `admin@sitransparan.rt` / `password123`.

3. **`resident`**
   - Portal warga terdaftar untuk mengisi RSVP kegiatan, melihat laporan keuangan internal, dan submit aspirasi.

4. **Pengunjung Publik (Tanpa Login)**
   - Mengakses data publik RT melalui endpoint tenant slug `/api/v1/t/:slug/*`.

---

## 3. Swagger & Interactive OpenAPI

Dokumentasi API lengkap dengan spec OpenAPI 3.0 disajikan langsung oleh server Go:
- **Swagger UI**: `http://localhost:8081/swagger/`
- **OpenAPI Spec**: `http://localhost:8081/swagger/openapi.yaml`

---

## 4. Alur Portal Transparansi Publik

1. Pengunjung membuka rute frontend `/public/announcements`, `/public/aspirations`, atau `/public/events`.
2. Frontend secara otomatis memanggil endpoint public tenant:
   - `GET /api/v1/t/sitransparan-rt/announcements`
   - `GET /api/v1/t/sitransparan-rt/documents`
   - `GET /api/v1/t/sitransparan-rt/aspirations`
   - `GET /api/v1/t/sitransparan-rt/needs`
3. Warga dapat mengirimkan aspirasi tanpa login via `POST /api/v1/t/sitransparan-rt/aspirations`.
