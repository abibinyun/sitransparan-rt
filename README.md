# Sitransparan RT / RW

Platform Multi-Tenant SaaS PWA untuk Transparansi Keuangan, Administrasi Warga, dan Portal Publik RT/RW.

---

## 🚀 Fitur Utama

- **Public Transparency Portal (`/public/*`)**: Berita edaran RT, dokumen publik (peraturan & notulen rapat), timeline aspirasi warga, serta agenda kegiatan RT tanpa perluk login.
- **Multi-Tenant Architecture**: Pemisahan data antar-RT berdasarkan `tenant_id` dan slug URL (`/api/v1/t/:slug/*`).
- **Sistem Role & RBAC**:
  - `superadmin`: Pengelolaan tenant dan platform global.
  - `admin_rt`: Pengelolaan warga, transaksi keuangan, pengadaan fasilitas, & edaran RT.
  - `resident`: Portal warga terdaftar (konfirmasi RSVP, submit aspirasi, unduh laporan).
- **Interactive OpenAPI / Swagger UI**: Dokumentasi API terintegrasi yang dapat dicoba secara langsung.

---

## 🛠️ Tech Stack

- **Backend**: Go (Standard Library `net/http` router), PostgreSQL (Docker), MinIO (Object Storage).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query (React Query), Axios, Lucide Icons.
- **API Specs**: OpenAPI 3.0 (Served via Swagger UI).

---

## 🔑 Credential Default / Sample Data

### 1. Account Roles

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Super Admin** | `admin@gmail.com` | `admin123` | Akses penuh multi-tenant & manajemen RT |
| **Super Admin Default** | `superadmin@platform.local` | `admin123` | System fallback superadmin |
| **Admin RT** | `admin@sitransparan.rt` | `password123` | Pengurus RT (Kas, Warga, Agenda) |

### 2. Tenant Sample
- **Nama Tenant**: Sitransparan RT
- **Slug**: `sitransparan-rt`
- **Tenant ID**: `00000000-0000-0000-0000-000000000010`

---

## 🌐 Endpoint & API Documentation

- **Swagger UI (Interactive API Docs)**: `http://localhost:8081/swagger/`
- **OpenAPI Spec (YAML)**: `http://localhost:8081/swagger/openapi.yaml`
- **Port Frontend**: `http://localhost:5173`
- **Port Backend**: `http://localhost:8081`

### Endpoint Publik RT Slug (`/api/v1/t/:slug/*`)
- `GET /api/v1/t/sitransparan-rt/announcements` - Pengumuman & edaran publik
- `GET /api/v1/t/sitransparan-rt/documents` - Dokumen & notulen publik
- `GET /api/v1/t/sitransparan-rt/aspirations` - Rekap aspirasi publik warga
- `POST /api/v1/t/sitransparan-rt/aspirations` - Submit aspirasi warga
- `GET /api/v1/t/sitransparan-rt/needs` - Rekap pengadaan / kebutuhan fasilitas RT

---

## 🛠️ Cara Menjalankan Aplikasi

### 1. Prerequisites & Database
Pastikan PostgreSQL & MinIO container sudah berjalan:
```bash
docker ps
```
*DB Port: `5433` (Local mapped), Database: `transparansi_rt`, User/Pass: `postgres/postgres`.*

### 2. Menjalankan Backend (Go)
```bash
cd backend
PORT=8081 DB_PORT=5433 go run cmd/server/main.go
```
Atau jalankan binary terkompilasi:
```bash
PORT=8081 DB_PORT=5433 ./server
```

### 3. Menjalankan Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Akses frontend di browser: `http://localhost:5173`.

---

## 🗄️ Database Migrations

File migrasi database tersimpan di `backend/migrations/`:
- `000001_init_schema.up.sql`: Core schema (tenants, users, roles, tenant_users).
- `000002_create_residents.up.sql`: Schema warga & anggota keluarga.
- `000003_create_financials.up.sql`: Kategori iuran, pembayaran warga, & kas RT.
- `000004_create_events.up.sql`: Kegiatan RT, anggaran, & RSVP.
- `000005_create_aspirations_and_needs.up.sql`: Aspirasi warga & pengadaan fasilitas RT.
- `000006_create_announcements_and_documents.up.sql`: Pengumuman & dokumen.
- `000007_seed_default_admin.up.sql`: Seed data default admin.
- `000008_seed_public_sample_data.up.sql`: Seed sample data portal transparansi publik.

Eksekusi migrasi manual via Docker:
```bash
docker exec -i transparansi_postgres psql -U postgres -d transparansi_rt < backend/migrations/000008_seed_public_sample_data.up.sql
```
