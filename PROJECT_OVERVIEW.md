# Sitransparan RT/RW — Project Master Documentation

Dokumen ini adalah **satu-satunya sumber kebenaran (Single Source of Truth)** untuk seluruh arsitektur, fitur, kredensial, dan operasional proyek **Sitransparan RT/RW**.

---

## 1. Ringkasan Proyek

**Sitransparan RT/RW** adalah platform SaaS PWA Multi-Tenant yang dirancang untuk transparansi tata kelola lingkungan RT/RW. Masing-masing RT/RW memiliki isolasi data yang aman, laporan keuangan mutlak immutable, serta portal transparansi publik.

### Fitur Utama
1. **Multi-Tenancy Schema Isolation**: Isolasi data per RT menggunakan PostgreSQL schema (`tenant_<slug>`).
2. **Ledger Keuangan Immutable**: Pemasukan dan pengeluaran bersifat append-only (offset reversing entry untuk koreksi).
3. **Keamanan Data Demografi (NIK Encryption)**: NIK dienkripsi dengan AES-256 GCM + HMAC deterministic search hash.
4. **Kegiatan, RAB & Budgets**: Manajemen kegiatan RT, rancangan anggaran biaya (RAB), RSVP warga, serta upload kuitansi donasi/kegiatan.
5. **Portal Transparansi Publik**: Halaman informasi publik tanpa login (`/public/announcements`, `/public/aspirations`, `/public/events`).
6. **Frontend Modern (Shadcn UI + React Portal)**: Antarmuka PWA berbasis Tailwind, Shadcn UI primitives, Radix UI Dialog Portal, dan React.lazy code splitting.

---

## 2. Tech Stack

- **Backend**: Go 1.24+ (Standard Library `net/http` router, Clean Architecture)
- **Database**: PostgreSQL 16 (Schema-per-Tenant) + Redis (Cache & Session)
- **Storage**: MinIO / S3 API Compatible (KTP/KK photos, Kwitansi, Dokumen)
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Shadcn UI, TanStack Query v5, Zustand, React Router v6
- **Reverse Proxy & Routing**: Traefik v2.10 & Nginx
- **Containerization**: Docker Compose Unified Setup

---

## 3. Struktur Monorepo

```text
.
├── backend/                  # Source code Go API Server
│   ├── cmd/server/           # Entrypoint main.go
│   ├── internal/             # Clean Architecture (delivery, usecase, repository, domain)
│   ├── migrations/           # Raw SQL Migrations (000001 - 000009)
│   └── pkg/                  # Crypto (AES-256 GCM/HMAC), Config, Storage
├── frontend/                 # Source code React PWA SPA
│   ├── src/components/ui/    # Shadcn UI Primitives (Button, Card, Dialog, Table, Input, Select, etc)
│   ├── src/pages/            # Dynamic code-split pages (React.lazy)
│   ├── src/services/         # API hooks (TanStack Query) & Axios client
│   └── src/store/            # Zustand auth state
├── infrastructure/           # Docker Compose, Traefik, Postgres, MinIO config
└── Makefile                  # Single command build & lifecycle helper
```

---

## 4. Kredensial Default & Akun Penguji

- **Superadmin Platform**:
  - Email: `admin@gmail.com`
  - Password: `admin123`
- **Admin RT Default** (`sitransparan-rt`):
  - Email: `admin@sitransparan.rt`
  - Password: `password123`

---

## 5. Cara Menjalankan Proyek

```bash
# Jalankan seluruh stack (Postgres, MinIO, Redis, Traefik, Backend, Frontend) & migrasi SQL otomatis
make up

# Jalankan migrasi SQL saja
make migrate

# Tampilkan log service
make logs

# Hentikan semua service
make down

# Reset data & volume bersih
make clean && make up
```

---

## 6. URL & Access Points

- **Frontend Portal**: `http://localhost:3000`
- **Backend REST API**: `http://localhost:8081/api/v1`
- **Swagger / OpenAPI Documentation**: `http://localhost:8081/swagger/`
- **Traefik Dashboard**: `http://localhost:8080`
- **MinIO Console**: `http://localhost:9001` (User: `minioadmin`, Pass: `minioadmin`)
