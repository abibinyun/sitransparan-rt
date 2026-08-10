# Arsitektur — Sitransparan RT/RW

Dokumen ini menggambarkan arsitektur **aktual** project berdasarkan source code, migrasi database, route handler, dan frontend. Jika ada konflik dengan dokumen lain, source code adalah sumber kebenaran.

---

## 1. Ringkasan

**Sitransparan RT/RW** adalah platform SaaS PWA multi-tenant untuk transparansi tata kelola lingkungan RT/RW. Setiap RT adalah **tenant** yang datanya diisolasi dalam **PostgreSQL schema-per-tenant** (`tenant_<slug>`). Sistem mencakup:

- Autentikasi JWT (HS256) dengan role & scope tenant dari database.
- Manajemen pengguna per tenant (Admin RT) dan lintas tenant (Super Admin).
- Pendataan warga (residents + family members) dengan enkripsi NIK.
- Buku kas transparan (iuran warga, transaksi kas, saldo, laporan).
- Kegiatan & penganggaran (RAB), panitia acara, RSVP, sponsor, kuitansi.
- Aspirasi warga & kebutuhan lingkungan, pengumuman & dokumen publik.
- Portal transparansi publik tanpa login.

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Go (standard library `net/http` — method-pattern `ServeMux`), Clean Architecture (delivery → usecase → repository → domain) |
| Database | PostgreSQL 16, schema-per-tenant |
| Storage | MinIO (S3-compatible) untuk file bukti/dokumen |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn-style UI primitives, TanStack Query v5, Zustand, React Router v6 |
| PWA | `vite-plugin-pwa` (injectManifest) + Workbox service worker + IndexedDB offline cache |
| Reverse proxy | Traefik v3 (development, wildcard subdomain) + Nginx (frontend container, proxy `/api`) |
| Container | Docker Compose |

Catatan: Redis ada di `infrastructure/docker-compose.yml` tetapi **tidak digunakan** oleh backend (tidak ada koneksi Redis pada kode Go).

## 3. Struktur Monorepo

```text
.
├── backend/                      # Go API server
│   ├── cmd/server/main.go        # Entrypoint & route registration
│   ├── internal/
│   │   ├── domain/               # Entity, interface (repository/usecase), konstanta role
│   │   ├── delivery/http/        # HTTP handlers + middleware + openapi.yaml (embedded)
│   │   │   └── middleware/       # Auth (JWT), Tenant, RBAC, CORS, rate limit, security headers
│   │   ├── usecase/              # Business logic
│   │   └── repository/           # PostgreSQL (schema-qualified queries)
│   ├── migrations/               # 000001–000013 (raw SQL)
│   └── pkg/                      # config, crypto (AES-256-GCM + HMAC), storage/minio
├── frontend/                     # React PWA
│   ├── src/pages/                # Pages (React.lazy code splitting)
│   ├── src/components/           # Layout, modals, UI primitives
│   ├── src/services/             # API client & TanStack Query hooks
│   ├── src/store/                # Zustand auth store
│   └── src/sw.ts                 # Workbox service worker
├── infrastructure/               # Docker Compose dev, Traefik, Dockerfiles
├── docs/                         # Dokumentasi canonical
└── tests/e2e/                    # Playwright E2E
```

## 4. Arsitektur Backend

### 4.1 Alur Request

```text
Client
  → Nginx (frontend container, proxy /api) / Traefik
  → middleware: CORS → Security Headers → Rate Limit
  → AuthMiddleware   (validasi JWT HS256, pinjam claims ke context)
  → TenantMiddleware (tenant dari JWT claims, verifikasi ke DB)
  → RBACMiddleware / RequireAnyRole (guard role per route/handler)
  → Handler → Usecase → Repository (schema-qualified `tenant_<slug>.<table>`)
```

Urutan mounting (lihat `backend/cmd/server/main.go`):

- **Public** (tanpa middleware): `/health`, `/api/v1/t/{slug}/...` (public tenant resources), `/api/v1/auth/login`, `/api/v1/auth/register`, `/swagger/*`.
- **Authenticated**: `authMw(tenantMw(handler))`.
- **Admin (superadmin + admin_rt)**: `authMw(adminMw(tenantMw(handler)))` — hanya `/api/v1/users`.
- **Super Admin saja**: `authMw(superAdminMw(tenantMw(handler)))` — `/api/v1/superadmin/tenants`.

### 4.2 Middleware (backend/internal/delivery/http/middleware)

| Middleware | Fungsi |
|---|---|
| `AuthMiddleware` | Validasi `Authorization: Bearer <jwt>`; **hanya menerima HS256** (`jwt.WithValidMethods`); menolak token tanpa `user_id` valid; menyimpan claims di context. |
| `TenantMiddleware` | **Tenant context hanya dari JWT claims** (user_id + tenant_id). Header `X-Tenant-ID`, query param, dan subdomain **tidak dipercaya**. Jika tenant di claims tidak ditemukan di DB (tenant dihapus) → deny eksplisit 403. |
| `RBACMiddleware` | Cek role terhadap daftar yang diizinkan (case-insensitive; alias `superadmin`/`super_admin`). |
| `RequireAnyRole` (helper) | Dipakai handler untuk guard write/approve ops (hanya `superadmin`/`admin_rt`). |
| `CORSMiddleware` | `*` |
| `RateLimitMiddleware` | Token bucket, capacity 100, 10 req/s. |
| `SecurityHeadersMiddleware` | Security headers di semua response. |

### 4.3 Lapisan Aplikasi

- **Domain** (`internal/domain`): entity (`Tenant`, `User`, `Resident`, `FinancialTransaction`, `Event`, `Aspiration`, ...), konstanta `RoleSuperAdmin = "superadmin"`, `RoleAdminRT = "admin_rt"`, `RoleResident = "resident"`, dan interface repository/usecase.
- **Usecase** (`internal/usecase`): auth (login/register/switch-tenant/tenant CRUD), user (role escalation guard), resident, financial, event, aspiration_need, announcement_doc, dashboard.
- **Repository** (`internal/repository`): semua query tenant **schema-qualified** via helper `TenantTable(ctx, table)` → `tenant_<slug>.table`. Tidak ada `SET search_path` pada request path (mencegah bocor antar koneksi pool).

## 5. Multi-Tenancy

Model: **PostgreSQL schema-per-tenant**.

- Tabel global (`tenants`, `users`, `roles`, `tenant_users`, `audit_logs`) ada di schema **public**.
- Setiap tenant memiliki schema **`tenant_<slug>`** (karakter `-` diganti `_`) yang berisi tabel operasional: `residents`, `family_members`, `fee_categories`, `dues_payments`, `financial_transactions`, `events`, `event_budgets`, `event_participants`, `event_sponsors`, `event_roles`, `event_receipts`, `aspirations`, `community_needs`, `announcements`, `documents`.
- Schema tenant dibuat otomatis saat tenant dibuat (`CreateTenantSchema` di `repository/postgres_repos.go`) dan **dihapus** (`DROP SCHEMA ... CASCADE`) saat tenant dihapus.
- Migrasi `000012_backfill_tenant_schemas` memprovisikan schema untuk tenant yang dibuat sebelum fitur ini ada dan menyalin data seed/demo dari tabel public ke schema tenant (idempotent).

### 5.1 Resolusi Tenant (Backend)

Tenant aktif **hanya** berasal dari JWT claims yang sudah diverifikasi:

1. `AuthMiddleware` memverifikasi token → `user_id`, `tenant_id`, `role` dari DB (`tenant_users JOIN roles`, hanya mapping `status='active'`).
2. `TenantMiddleware` mengambil tenant dari claims dan memvalidasi eksistensinya di DB.

Klien tidak dapat memilih tenant lewat header/query/body. Perpindahan tenant hanya lewat `POST /api/v1/auth/switch-tenant`, yang memverifikasi mapping user→tenant di server dan menerbitkan JWT baru.

### 5.2 Resolusi Tenant (Public Portal)

Endpoint publik `/api/v1/t/{slug}/...` me-resolve tenant dari **slug di path** (`tenantRepo.GetBySlug`). Frontend menurunkan slug dari hostname (`frontend/src/utils/tenant.ts`):

- `localhost` / `127.0.0.1` / `app.openrt.local` / `api.openrt.local` → fallback `sitransparan-rt`.
- Host `<subdomain>.openrt.local` (3+ bagian) → `subdomain` sebagai slug.

## 6. Arsitektur Frontend

- **SPA React** dengan `React.lazy` code splitting per halaman.
- **State**: Zustand `useAuthStore` (token, user, activeTenant di localStorage).
- **Data fetching**: TanStack Query (`frontend/src/lib/queryClient.ts`). `queryClient.clear()` dipanggil pada login/logout/switch tenant untuk mencegah data tenant lama tampil di tenant baru.
- **API client** (`services/api.ts`): axios, `baseURL: /api/v1`, Bearer token dari store, **tidak mengirim header `X-Tenant-ID`**, response 401 → auto logout.
- **Routing** (`App.tsx`):
  - `/login`
  - Public (PublicLayout): `/public/announcements`, `/public/aspirations`, `/public/events`
  - Protected (MainLayout): `/` (dashboard), `/residents`, `/financial`, `/events`, `/aspirations`, `/announcements`
  - `/users` — role `SUPER_ADMIN` atau `RT_ADMIN`
  - `/superadmin/tenants` — role `SUPER_ADMIN`
- **PWA**: service worker Workbox (NetworkFirst untuk navigasi & `/api`, StaleWhileRevalidate untuk aset statis) + cache IndexedDB untuk data residents (offline).
- Navigasi sidebar di-filter berdasarkan role (halaman admin disembunyikan untuk resident) — lapisan UX; keamanan tetap di backend.

## 7. Integrasi Storage (MinIO)

Backend memiliki integrasi MinIO (`backend/pkg/storage/minio`) untuk upload file (bukti iuran, kuitansi, dokumen, KTP/KK). Upload dilakukan lewat endpoint multipart (`/api/v1/residents/upload`, `/api/v1/financial/upload`, upload receipt event). PostgreSQL menyimpan URL/referensi file, bukan binary-nya.

> Catatan: integrasi MinIO tidak punya unit test (tidak ada MinIO terkonfigurasi pada environment test lokal).
