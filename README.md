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
cd backend && go test ./...          # unit + integration + security (Go test suite)
cd frontend && npm test              # frontend unit test (Vitest)
cd frontend && npm run build         # tsc + vite build
npx playwright test --config=playwright.headless.config.ts   # E2E (butuh stack docker di localhost:3000)
```

### Menjalankan Obsidian Documentation Vault

```bash
# Buka Obsidian Vault langsung ke direktori docs/
./open-docs.sh
```

## Dokumentasi (Obsidian Knowledge Vault)

Seluruh dokumentasi sistem telah distrukturkan ke dalam **Obsidian Documentation Vault** di direktori `docs/` dengan peta konten terpusat di `docs/00-MOC.md`:

| Dokumen / Pilar | Isi |
|---|---|
| [docs/00-MOC.md](docs/00-MOC.md) | **Master Map of Content (MOC Hub)** |
| [docs/01-architecture/](docs/01-architecture/) | Arsitektur Clean Backend Go, Multi-Tenancy PostgreSQL, RBAC, Subdomain |
| [docs/02-modules/](docs/02-modules/) | 11 Modul Bisnis: Kependudukan, Keuangan, Bank Sampah, Karang Taruna, dll |
| [docs/03-database/](docs/03-database/) | Katalog Skema Database, Histori Migrasi 000001–000050, Integritas Data |
| [docs/04-api-contracts/](docs/04-api-contracts/) | Inventaris Endpoint API Terverifikasi & OpenAPI 3.0 (Swagger) |
| [docs/05-operations-devops/](docs/05-operations-devops/) | Setup Lingkungan, Docker, Traefik v3.6, SDLC Promotion Rules |
| [docs/06-testing-qa/](docs/06-testing-qa/) | Playwright E2E Test Suite, Go Backend Test Suites, Audit Archive |
| [docs/07-frontend-design/](docs/07-frontend-design/) | Apple Design Tokens, Aturan Anti-AI-Slop, Bundle Splitting & PWA |
| [docs/08-roadmaps/](docs/08-roadmaps/) | Roadmap Fitur Komunitas & Integrasi Pembayaran QRIS Otomatis |
