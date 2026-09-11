# Arsitektur — Sitransparan RT/RW

Dokumen ini menggambarkan arsitektur **aktual** project berdasarkan source code, migrasi database, route handler, dan frontend. Jika ada konflik dengan dokumen lain, source code adalah sumber kebenaran.

---

## 1. Ringkasan

**Sitransparan RT/RW** adalah platform SaaS PWA multi-tenant untuk transparansi tata kelola lingkungan RT/RW. Setiap RT adalah **tenant** yang datanya diisolasi dalam **PostgreSQL schema-per-tenant** (`tenant_<slug>`). Sistem mencakup:

- Autentikasi JWT HS256 24 jam dengan role & scope tenant dari database.
- Manajemen pengguna per tenant (Admin RT) dan lintas tenant (Super Admin).
- Pendataan warga (residents + family members) dengan enkripsi NIK AES-256-GCM+HMAC.
- Buku kas transparan multi-kantong (funds `is_default` guard, kategori iuran, dues `pending|verified|rejected`, transaksi append-only).
- Kegiatan & RAB (budget ter-embed di list), RSVP, panitia, sponsor, kuitansi, transparansi.
- Notulen rapat (meetings + attendees + decisions + action_items, visibilitas `public|internal|confidential` enforced server-side).
- Aspirasi & kebutuhan lingkungan, pengumuman (`media_urls` galeri) & dokumen (`PUT /documents/{id}`).
- Karang Taruna: periode masa bakti (`active/archived/draft`), pengurus inti & seksi bidang, publikasi struktur.
- Bank Sampah: katalog kategori harga & bagi hasil warga-pemuda, pencatatan setoran per KK, buku tabungan KK, alokasi kas Karang Taruna.
- Portal transparansi publik tanpa login (`/kabar`, `/usulan`, `/agenda`, `/karang-taruna`, `/bank-sampah`; legacy `/public/*` redirect).
- Sosial: reaksi `support|like|applause` + polling 2–6 opsi + badge partisipasi.
- PWA + Web Push VAPID (graceful disable jika keys kosong).

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Go 1.25 (standard library `net/http` — method-pattern `ServeMux`), Clean Architecture (delivery → usecase → repository → domain) |
| Database | PostgreSQL 16, schema-per-tenant, 27 migrasi (000001–000027), 26+ tabel tenant |
| Storage | MinIO (S3-compatible) — bucket `sitransparan-files`, prefix per-tenant `tenant_<slug>/<category>/`, `MINIO_PUBLIC_URL` untuk URL host-reachable; fallback `/uploads/...` jika storage nil |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn-style UI primitives, TanStack Query v5, Zustand, React Router v6 |
| PWA | `vite-plugin-pwa` (injectManifest) + Workbox service worker + IndexedDB offline cache |
| Push | Web Push VAPID (`push_subscriptions`); `VAPID_PUBLIC_KEY/PRIVATE_KEY` kosong → push disabled |
| Reverse proxy | Traefik v3.6+ (wildcard subdomain routing) + Nginx (frontend container, proxy `/api`) |
| Container | Docker Compose (tanpa Redis — rate-limit in-memory per-IP) |

## 3. Struktur Monorepo

```text
.
├── backend/                      # Go API server
│   ├── cmd/server/main.go        # Entrypoint & route registration
│   ├── internal/
│   │   ├── domain/               # Entity, interface (repository/usecase), konstanta role
│   │   ├── delivery/http/        # HTTP handlers + middleware + openapi.yaml (embedded, 54KB)
│   │   │   └── middleware/       # Auth (JWT), Tenant, RBAC, CORS, rate limit, security headers, hostname
│   │   ├── usecase/              # Business logic (auth, resident, financial, event, aspiration_need, announcement_doc, dashboard, meeting, social, push)
│   │   └── repository/           # PostgreSQL (schema-qualified queries via TenantTable)
│   ├── migrations/               # 000001–000020 (raw SQL)
│   └── pkg/                      # config, crypto (AES-256-GCM + HMAC, panic jika NIK_ENCRYPTION_KEY !=32 di prod), storage/minio
├── frontend/                     # React PWA
│   ├── src/pages/                # Pages (React.lazy): Login, Dashboard, Residents, Financial, Events, Meetings, Aspirations, Announcements, Polls, Users, SuperAdminTenants, Public*
│   ├── src/components/           # Layout, modals (EventBudget/RSVP, Polls), UI primitives
│   ├── src/services/             # api.ts (/api/v1), dashboard.ts (blob export), social.ts (/reactions|/polls fixed), push.ts (via api)
│   ├── src/store/                # Zustand useAuthStore (localStorage, cross-subdomain cookie, BroadcastChannel)
│   ├── src/utils/tenant.ts       # getTenantSlugFromHost (VITE_TENANT_BASE_DOMAIN)
│   └── src/sw.ts                 # Workbox service worker
├── infrastructure/               # Docker Compose dev, Traefik, Dockerfiles
├── docs/                         # Dokumentasi canonical
└── tests/e2e/                    # Playwright E2E (64 tests)
```

## 4. Arsitektur Backend

### 4.1 Alur Request

```text
Client (rt-003.openrt.local)
  → DNS wildcard *.openrt.local  (hanya routing, bukan otorisasi)
  → Traefik v3 (router wildcard) → Frontend (Nginx) atau Backend langsung
  → middleware: CORS → Security Headers → Rate Limit (per-IP)
  → AuthMiddleware   (validasi JWT HS256, pinjam claims ke context)
  → TenantMiddleware (hostname → lookup tenant → cocokkan dengan JWT → context)
  → RBACMiddleware / RequireAnyRole (guard role per route/handler)
  → Handler → Usecase → Repository (schema-qualified `tenant_<slug>.<table>`)
```

Urutan mounting (lihat `backend/cmd/server/main.go`):

- **Public** (tanpa middleware): `/health`, `/api/v1/t/{slug}/...` (public tenant resources), `/api/v1/t/resolve`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/swagger/*`, `/api/v1/push/config`.
- **Authenticated**: `authMw(tenantMw(handler))` — termasuk `GET /auth/me`, `/residents`, `/financial/*`, `/events`, `/meetings`, `/aspirations`, `/needs`, `/announcements`, `/documents`, `/dashboard/*`, `/reactions`, `/polls`, `/push/subscribe|unsubscribe`, `/social/badge`.
- **Admin (superadmin + admin_rt)**: `authMw(adminMw(tenantMw(handler)))` — `/api/v1/users`.
- **Super Admin saja**: `authMw(superAdminMw(tenantMw(handler)))` — `/api/v1/superadmin/tenants`.

### 4.2 Middleware (backend/internal/delivery/http/middleware)

| Middleware | Fungsi |
|---|---|
| `AuthMiddleware` | Validasi `Authorization: Bearer <jwt>`; **hanya menerima HS256** (`jwt.WithValidMethods`); menolak token tanpa `user_id` valid; menyimpan claims di context. |
| `TenantMiddleware` | **Resolusi hostname→tenant + match JWT** (lihat §5). Pada host platform (`localhost`, domain dasar, subdomain app/api) tenant berasal dari JWT claims. Pada subdomain tenant (`rt-003.<base>`) tenant di-lookup dari DB, harus **exist + active**, dan **harus sama dengan tenant JWT** — mismatch → 403. Host asing/tidak dikenal → 403. `X-Tenant-ID`/query/`X-Forwarded-Host` tidak pernah dipercaya. |
| `RBACMiddleware` | Cek role terhadap daftar yang diizinkan (case-insensitive; alias `superadmin`/`super_admin`). |
| `RequireAnyRole` (helper) | Dipakai handler untuk guard write/approve ops (hanya `superadmin`/`admin_rt`). |
| `CORSMiddleware` | **Allowlist origin** (bukan reflection): hanya subdomain tenant dari `TENANT_BASE_DOMAIN`, domain dasar, dan origin localhost/loopback dev yang mendapat header CORS; origin asing tidak mendapat header (browser blokir). `Vary: Origin` diset. |
| `RateLimitMiddleware` (`IPRateLimiter`) | Token bucket **per client IP** (default capacity 1000, 100 req/s per IP). Satu client tidak bisa menghabiskan kuota global. `/health` & `/swagger/` dikecualikan. `X-Forwarded-For` hanya dipercaya dari peer di `TRUSTED_PROXY_IPS` (CIDR supported). Auth endpoints budget ketat (20 burst / 5 per detik per IP). |
| `SecurityHeadersMiddleware` | Security headers di semua response. |

### 4.3 Lapisan Aplikasi

- **Domain** (`internal/domain`): entity (`Tenant`, `User`, `Resident`, `FinancialTransaction`, `Fund`, `Event`, `Meeting`, `Aspiration`, `Announcement`, `Reaction`, `Poll`, ...), konstanta `RoleSuperAdmin = "superadmin"`, `RoleAdminRT = "admin_rt"`, `RoleResident = "resident"`, dan interface repository/usecase.
- **Usecase** (`internal/usecase`): auth (login/register/switch-tenant/me/tenant CRUD), user (role escalation guard), resident, financial (funds `is_default` guard, dues verify, summary), event (budget agregat di list, RSVP), meeting (visibility enforced), aspiration_need, announcement_doc (`media_urls` validasi), dashboard (blob export), social (reaction/poll/badge), push (VAPID).
- **Repository** (`internal/repository`): semua query tenant **schema-qualified** via helper `TenantTable(ctx, table)` → `tenant_<slug>.table`. Tidak ada `SET search_path` pada request path.

## 5. Multi-Tenancy

Model: **PostgreSQL schema-per-tenant**.

- Tabel global (`tenants`, `users`, `roles`, `tenant_users`, `audit_logs`, `portal_events`, `push_subscriptions`) ada di schema **public**.
- Setiap tenant memiliki schema **`tenant_<slug>`** (karakter `-` diganti `_`) yang berisi tabel operasional: `residents`, `family_members`, `fee_categories`, `dues_payments`, `financial_transactions`, `funds`, `events`, `event_budgets`, `event_participants`, `event_sponsors`, `event_roles`, `event_receipts`, `aspirations`, `community_needs`, `announcements`, `documents`, `meetings`, `meeting_attendees`, `meeting_decisions`, `meeting_action_items`, `reactions`, `polls`, `poll_votes`.
- Schema tenant dibuat otomatis saat tenant dibuat (`CreateTenantSchema`) dan **dihapus** (`DROP SCHEMA ... CASCADE`) saat tenant dihapus.
- Migrasi `000012_backfill_tenant_schemas` memprovisikan schema untuk tenant yang dibuat sebelum fitur ini ada (idempotent); `000016` seed 3 funds default; `000017–000020` tambah meetings/reactions/polls/push.

### 5.1 Resolusi Tenant (Backend)

Tenant aktif **hanya** berasal dari JWT claims yang sudah diverifikasi:

1. `AuthMiddleware` memverifikasi token → `user_id`, `tenant_id`, `role` dari DB (`tenant_users JOIN roles`, hanya mapping `status='active'`).
2. `TenantMiddleware` mengambil tenant dari claims dan memvalidasi eksistensinya di DB (tenant harus ada dan `status='active'`).

Klien tidak dapat memilih tenant lewat header/query/body. Perpindahan tenant hanya lewat `POST /api/v1/auth/switch-tenant`, yang memverifikasi mapping user→tenant di server dan menerbitkan JWT baru.

### 5.2 Resolusi Tenant dari Hostname (Tenant-Aware Subdomain)

Backend mendukung tenant-aware subdomain: setiap tenant mendapat domain default `<slug>.<TENANT_BASE_DOMAIN>` (env `TENANT_BASE_DOMAIN`, dev `openrt.local`, produksi `openrt.com` — **tidak ada domain hardcoded**).

Chain keamanan:

```text
Hostname (r.Host saja — X-Forwarded-Host tidak pernah dipercaya)
  → NormalizeHost (lowercase, buang port/trailing dot)
  → HostnameSlug: subdomain dari <TENANT_BASE_DOMAIN>? (valid slug, bukan app/api/www)
  → lookup tenants WHERE slug = <slug>   (dan WHERE domain = <host> untuk custom domain)
  → tenant harus EXIST dan ACTIVE  (status='active')
  → tenant JWT (claims) harus SAMA dengan tenant hostname  → mismatch DENY 403
  → tenant context → query schema-qualified tenant_<slug>.*
```

Aturan:

- **Subdomain tenant** (`rt-003.openrt.local`) → lookup slug; tidak ada/`inactive` → 403; JWT tenant ≠ hostname tenant → 403.
- **Host platform** (`localhost`, `127.0.0.1`, domain dasar, `app.*`/`api.*`) → tenant dari JWT claims.
- **Host asing / unknown** → 403 (atau 404 di Traefik).
- Endpoint identitas (`/api/v1/auth/*`) dikecualikan dari match hostname/JWT supaya login & switch-tenant tetap bisa.

### 5.3 Resolusi Tenant (Public Portal)

Endpoint publik `/api/v1/t/{slug}/...` me-resolve tenant dari **slug di path** dan menolak tenant `inactive` (404). Jika hostname adalah subdomain tenant, slug path **harus sama** dengan slug hostname (else 404). Frontend menurunkan slug dari hostname (`frontend/src/utils/tenant.ts`, env `VITE_TENANT_BASE_DOMAIN` — build-time, harus sama dengan `TENANT_BASE_DOMAIN` backend):

- Host platform → fallback `sitransparan-rt`.
- Host `<subdomain>.<base>` dengan slug valid → `subdomain` sebagai slug.

## 6. Arsitektur Frontend

- **SPA React** dengan `React.lazy` code splitting per halaman.
- **State**: Zustand `useAuthStore` (token, user, activeTenant di localStorage + cookie `Domain=.openrt.local` untuk cross-subdomain, `BroadcastChannel` + hard reload untuk sinkron mix-login, `host guard` di `MainLayout` bounce ke tenant yang benar, `api` 403 tenant clear).
- **Data fetching**: TanStack Query. `queryClient.clear()` pada login/logout/switch tenant.
- **API client** (`services/api.ts`): axios `baseURL: /api/v1`, Bearer token, **tidak mengirim `X-Tenant-ID`**, 401 → auto logout; `social.ts` fix `/reactions|/polls` (was double prefix), `push.ts` via `api` (was axios 401), `dashboard.ts` export via blob `GET /dashboard/reports/financial/export?format=csv|pdf`, `EventBudget/RSVP` toast, `PollsPage`.
- **Routing** (`App.tsx`):
  - `/login`
  - Public: `/` (tenant→feed `PublicAnnouncementsPage`, platform→`PlatformLandingPage`), `/kabar`, `/usulan`, `/agenda` (legacy `/public/*` redirects)
  - Protected (MainLayout): `/admin` (dashboard blob export), `/admin/residents|financial|events|meetings|aspirations|announcements|polls` + `/admin/users` (`SUPER_ADMIN|RT_ADMIN`) + `/admin/tenants` (`SUPER_ADMIN`); legacy `/residents` etc → `/admin/*` redirects
- **Superadmin UX**: Tenant Aktif switcher + Masuk Tenant button di header; guard host mismatch.
- **PWA & Caching**: Workbox Service Worker (`sw.ts`). Navigasi HTML murni `NetworkOnly` (tanpa precache `index.html`) untuk menjamin kesegaran bundle saat hard-refresh / pull-to-refresh; aset statis (`js`, `css`, `fonts`, `images`) di-cache dengan `StaleWhileRevalidate`. Auto `skipWaiting()` dan pembersihan `pages-cache` saat aktivasi.
- **Pengumuman & Lampiran**: Mendukung multi-gambar (`media_urls`) dan multi-file dokumen (`file_urls` PDF/Office). Portal publik dilengkapi modal detail interaktif (`AnnouncementDetailModal`).

## 7. Integrasi Storage (MinIO)

Backend `pkg/storage/minio` menyimpan file nyata di bucket `sitransparan-files` (auto-create + public-download policy) dengan key per-tenant `<tenant-slug>/<kategori>/<uuid><ext>` dan URL via `MINIO_PUBLIC_URL`. Jika storage nil → fallback URL metadata `/uploads/...`. Upload endpoints: `/financial/upload`, `/residents/upload`, `/documents`, `POST /events/{id}/receipts`.
