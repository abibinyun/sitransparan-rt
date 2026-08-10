# Sitransparan RT/RW

Platform SaaS PWA multi-tenant untuk transparansi tata kelola lingkungan RT/RW: pendataan warga, buku kas transparan (append-only), kegiatan & RAB, aspirasi warga, pengumuman & dokumen, serta portal transparansi publik. Setiap RT diisolasi dalam PostgreSQL schema-per-tenant (`tenant_<slug>`).

## Fitur Utama

- **Multi-tenant schema isolation** — data per RT di PostgreSQL schema terpisah; tenant context hanya dari JWT (tidak dipercaya dari klien).
- **Autentikasi JWT (HS256)** dengan role & scope tenant dari database (`superadmin`, `admin_rt`, `resident`).
- **Pendataan warga** — residents & family members, enkripsi NIK (AES-256-GCM + HMAC lookup), approval warga.
- **Buku kas transparan** — iuran warga (catat & verifikasi), transaksi kas append-only (koreksi via reversing entry), ringkasan saldo, export laporan CSV/PDF.
- **Kegiatan & penganggaran** — RAB/budget, panitia acara, RSVP, sponsor, kuitansi donasi.
- **Aspirasi & kebutuhan** — aspirasi warga, kebutuhan lingkungan, respons pengurus.
- **Pengumuman & dokumen** — edaran, dokumen publik.
- **Portal transparansi publik** — halaman publik tanpa login (`/public/announcements`, `/public/aspirations`, `/public/events`).
- **PWA** — service worker Workbox + offline cache.

## Tech Stack

Go (net/http, Clean Architecture) · PostgreSQL 16 · MinIO · React 18 + TypeScript + Vite + Tailwind + TanStack Query + Zustand · Docker Compose + Traefik/Nginx.

## Quick Start

```bash
make up        # Docker stack + migrasi
# Frontend: http://localhost:3000 · Backend: http://localhost:8081/api/v1 · Swagger: http://localhost:8081/swagger/
```

Akun default (seed):

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@platform.local` | `admin123` |
| Admin RT | `admin@sitransparan.rt` | `password123` |

## Testing

```bash
cd backend && go test ./...          # unit + integration + security
cd frontend && npm run build         # typecheck + build
npx playwright test --config=playwright.headless.config.ts   # E2E (stack docker harus jalan)
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Arsitektur aktual, tech stack, multi-tenancy |
| [docs/setup.md](docs/setup.md) | Setup, environment, command, akun default |
| [docs/authentication-authorization.md](docs/authentication-authorization.md) | Auth, JWT, RBAC matrix, isolasi tenant |
| [docs/api.md](docs/api.md) | Referensi endpoint API |
| [docs/database.md](docs/database.md) | Skema database & migrasi |
| [docs/testing.md](docs/testing.md) | Test suite & command |
| [docs/deployment.md](docs/deployment.md) | Deployment Docker/Traefik |
