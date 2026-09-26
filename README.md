# Sitransparan RT/RW

Platform SaaS PWA multi-tenant untuk transparansi tata kelola lingkungan RT/RW: pendataan warga, buku kas transparan (append-only + multi-kantong), kegiatan & RAB, notulen rapat, aspirasi warga, pengumuman & dokumen, polling & reaksi sosial, serta portal transparansi publik. Setiap RT diisolasi dalam PostgreSQL schema-per-tenant (`tenant_<slug>`).

## Fitur Utama

- **Multi-tenant schema isolation** — data per RT di PostgreSQL schema terpisah; tenant context hanya dari JWT (header `X-Tenant-ID` tidak pernah dipercaya).
- **Autentikasi JWT HS256 (24 jam)** dengan role & scope tenant dari database (`superadmin`, `admin_rt`, `resident`); TenantMiddleware cek hostname vs JWT (mismatch → 403); `TENANT_BASE_DOMAIN` env-driven.
- **Pendataan warga** — residents & family members, enkripsi NIK AES-256-GCM + HMAC lookup, approval warga.
- **Buku kas transparan** — multi-kantong (`funds` + `is_default` guard), kategori iuran, iuran warga (catat & verifikasi `pending|verified|rejected`), transaksi kas append-only, ringkasan saldo, export laporan CSV/PDF via backend blob.
- **Kegiatan & RAB** — events (budget ter-embed di list), RAB/budget, panitia, RSVP (toast), sponsor, kuitansi donasi, transparansi.
- **Notulen rapat** — meetings + attendees + decisions + action-items, visibilitas `public|internal|confidential` ditegakkan server-side.
- **Aspirasi & kebutuhan** — aspirasi (anonim publik & internal) + respons admin, community_needs.
- **Pengumuman & dokumen** — pengumuman dengan multi-foto galeri (`media_urls` max 10), multi-file lampiran dokumen (`file_urls` max 10), kategori postingan (`category`: pengumuman, kegiatan, santai, info), linimasa sosmed infinite scroll, komentar warga terbuka, modal interaktif publik, serta dokumen publik (`PUT /documents/{id}`).
- **Sosial** — reaksi `support|like|applause` (1 user 1 reaksi per target) + polling 2–6 opsi (1 user 1 suara) + badge partisipasi.
- **Portal transparansi publik** — `/kabar` (announcements & detail modal), `/usulan` (aspirations), `/agenda` (events) tanpa login; legacy `/public/*` redirect; endpoint publik `GET /t/{slug}/info|announcements|announcements/{id}|documents|aspirations|needs|meetings|events|financial-summary|polls/{id}` + KPI `feed_view/share_opened`.
- **PWA + Push** — service worker Workbox (navigasi HTML NetworkOnly tanpa cache usang, asset StaleWhileRevalidate) + IndexedDB; Web Push VAPID (`GET /push/config`, `POST /push/subscribe` via `api` auth, graceful disable jika keys kosong).
- **Keamanan** — NIK AES-GCM+HMAC (panic di prod jika `NIK_ENCRYPTION_KEY` ≠32), rate-limit per-IP (1000/100, auth 20/5, `TRUSTED_PROXY_IPS`), no token revocation.

## Tech Stack

Go 1.25 (`net/http` ServeMux, Clean Architecture) · PostgreSQL 16 (49 migrations 000001–000049, 29+ tenant tables) · MinIO (bucket `sitransparan-files`, prefix per-tenant `tenant_<slug>/<category>/`, fallback `/uploads`) · React 18 + TypeScript + Vite + Tailwind + TanStack Query + Zustand + React Router v6 · PWA Workbox + IndexedDB · Docker Compose + Traefik 3.6 / Nginx.

## Quick Start

```bash
make dev-up     # Jalankan stack dev live reload (Vite + Air)
make staging-up # Jalankan stack staging
make prod-up    # Jalankan stack production
# Dev: http://dev.iscube.web.id atau http://localhost:3000
# Backend Dev: http://localhost:8083/api/v1 · Swagger: http://localhost:8083/swagger/
```

Akun default (seed, verifikasi bcrypt di migrasi):

| Role | Email | Password |
|---|---|---|
| Super Admin | `abi@gmail.com` | `admin123` |
| Admin RT (tenant `sitransparan-rt`) | `admin@sitransparan.rt` | `password123` |
| Resident | daftar mandiri di `/login` (register tanpa tenant, lalu admin assign via `/admin/users`) | — |

Tenant subdomain lokal: `*.openrt.local` via `/etc/hosts` (mis. `rt-003.openrt.local`); `TENANT_BASE_DOMAIN` (backend) & `VITE_TENANT_BASE_DOMAIN` (frontend) harus sama.

## Testing

```bash
cd backend && go test ./...          # unit + integration + security (104 + 7 security)
cd frontend && npm run build         # tsc + vite build
npx playwright test --config=playwright.headless.config.ts   # E2E 64/64 (butuh stack docker di localhost:3000)
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Arsitektur aktual, tech stack, 3-tier multi-tenancy |
| [docs/setup.md](docs/setup.md) | Setup, environment, command, akun default |
| [docs/authentication-authorization.md](docs/authentication-authorization.md) | Auth, JWT, RBAC matrix, isolasi tenant, host guard |
| [docs/api.md](docs/api.md) | Referensi endpoint API (sinkron openapi.yaml) |
| [docs/database.md](docs/database.md) | Skema database & migrasi 000001–000049 |
| [docs/testing.md](docs/testing.md) | Test suite & command (104+7, E2E 64) |
| [docs/deployment.md](docs/deployment.md) | Deployment Docker/Traefik 3-tier |
