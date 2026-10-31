# AGENTS.md — Sitransparan RT/RW System & Operational Rules

**Version:** 3.1.0
**Target Agents:** Hermes (Telegram), Jcode (CLI), Claude Code, OpenCode, Codex.
**Canonical Documentation Hub:** 
**Autonomous Testing Methodology:** 

---

# 1. Project-Specific Context & Core Architecture

> The facts below were verified against the current source code, migrations, route
> registration, and tests at the time this section was written. Source code remains the
> authority: if a fact below conflicts with what you find in the code, trust the code and
> report the discrepancy.

## 46.1 Application Overview

**Sitransparan RT/RW** is a multi-tenant SaaS PWA for transparency of RT/RW neighborhood
governance: resident registration, transparent cash ledger, events & budgeting, community
aspirations, announcements & documents, and a public transparency portal. Each RT is a
tenant isolated in its own PostgreSQL schema.

## 46.2 Tech Stack & Repository Structure

| Layer | Stack |
|---|---|
| Backend | Go 1.25 (`backend/go.mod`), standard library `net/http` with method-pattern `ServeMux`, Clean Architecture (`delivery → usecase → repository → domain`) |
| Database | PostgreSQL 16, schema-per-tenant (`tenant_<slug>`, `-` → `_`) |
| Storage | MinIO (S3-compatible) — file uploads (proofs, receipts, documents, KTP/KK) |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn-style UI primitives, TanStack Query v5, Zustand, React Router v6 |
| PWA | `vite-plugin-pwa` (injectManifest) + Workbox service worker + IndexedDB offline cache |
| Reverse proxy | Traefik v3.6+ (dev, wildcard subdomain) + Nginx (frontend container proxies `/api`) |
| Container | Docker Compose |

```text
backend/                        Go API server
  cmd/server/main.go            entrypoint & route registration
  internal/domain/              entities, role constants, repository/usecase interfaces
  internal/delivery/http/       handlers + middleware/ + openapi.yaml (embedded)
  internal/usecase/             business logic
  internal/repository/          PostgreSQL, schema-qualified queries (TenantTable)
  migrations/                   000001–000021 raw SQL
  pkg/                          config, crypto (AES-256-GCM + HMAC), storage/minio
frontend/
  src/pages/                    React.lazy code-split pages
  src/services/                 axios client + TanStack Query hooks
  src/store/useAuthStore.ts     Zustand auth state (localStorage)
  src/sw.ts                     Workbox service worker
infrastructure/                 dev docker-compose, Traefik, Dockerfiles
docs/                           canonical documentation (see §46.10)
tests/e2e/                      Playwright regression suite
```

## 46.3 Authentication, Roles & Authorization

- **Auth**: `POST /api/v1/auth/login` (email + bcrypt password) → JWT **HS256**, valid **24 h**.
  Claims: `user_id`, `tenant_id`, `role`, `exp`, `iat`, `sub`.
- **Role & tenant scope come exclusively from the database** (`tenant_users JOIN roles`,
  mapping `status='active'`). Never derived from email or client input.
- **Roles (four roles)**: `superadmin` (platform/global), `admin_rt` (tenant admin),
  `operator` (operational staff, added via migration 000048, operational write/input without `/admin/users`),
  `resident` (read-only + participation).
- **Register** (`POST /api/v1/auth/register`) creates a user **without** tenant mapping;
  an admin must assign the user to a tenant via `/users`.
- **Tenant switching**: `POST /api/v1/auth/switch-tenant` — server-verified, re-issues JWT.
- **Tenant context is derived ONLY from verified JWT claims.** Header `X-Tenant-ID`,
  query params, and `X-Forwarded-Host` are never trusted. All tenant queries are
  schema-qualified (`tenant_<slug>.<table>`); there is no `SET search_path` on the request
  path.
- **Hostname is discovery, never a bypass.** On a tenant subdomain
  (`rt-003.<TENANT_BASE_DOMAIN>`) `TenantMiddleware` looks the tenant up in the DB, requires
  it to EXIST and be `status='active'`, and requires the JWT tenant to equal the hostname
  tenant (mismatch → 403). Unknown/foreign hosts (`rt-999.<base>`, `attacker.com`,
  `rt-003.<base>.attacker.com`) → 403/404. Tenants have a lifecycle `status` column
  (`active`/`inactive`, migration 000014); `inactive` tenants are denied at every boundary
  (middleware, public endpoints, switch-tenant).
- **Tenant subdomain config is env-driven**: `TENANT_BASE_DOMAIN` (backend,
  `backend/pkg/config/config.go`) and `VITE_TENANT_BASE_DOMAIN` (frontend build arg,
  `frontend/src/utils/tenant.ts`) — no production domain hardcoded.
- **RBAC enforcement**: write/approve/verify/assign operations are guarded with
  `middleware.RequireAnyRole(superadmin, admin_rt)`; `/api/v1/users` requires
  `adminMw`; `/api/v1/superadmin/tenants` requires `superAdminMw`. Only superadmin may
  create/set the `superadmin` role (role escalation → 403).
- **Known limitation**: no server-side token revocation on logout (JWT valid until expiry).
- Details: `docs/authentication-authorization.md`.

## 46.4 Multi-Tenancy

- Global tables (`tenants`, `users`, `roles`, `tenant_users`, `audit_logs`, `push_subscriptions`, `portal_events`) live in the
  `public` schema. Tenant operational data lives in `tenant_<slug>` schemas (27+ tables:
  residents, family_members, fee_categories, dues_payments, financial_transactions,
  funds, events, event_budgets, event_participants, event_sponsors, event_roles, event_receipts,
  aspirations, community_needs, announcements, documents, meetings, meeting_attendees, meeting_decisions,
  meeting_action_items, reactions, polls, poll_options, poll_votes, karang_taruna_periods, karang_taruna_configs,
  karang_taruna_members, houses, house_residents, house_qr_tokens, waste_categories, waste_deposits, waste_deposit_items).
- Creating a tenant auto-provisions its schema. Deleting a tenant executes a **soft-delete** (`deleted_at = NOW()`, `status = 'inactive'`) preserving schema data integrity.
- Public portal endpoints resolve the tenant from the **slug in the path**
  (`/api/v1/t/{slug}/info|announcements|documents|aspirations|needs|karang-taruna|waste-bank/summary|waste-bank/categories`) and reject
  `inactive` tenants (404). Hostname consistency is enforced: if the hostname is a tenant
  subdomain, the path slug must equal the hostname slug (else 404). The frontend derives
  the slug from the hostname (`getTenantSlugFromHost`, env-driven base domain, fallback
  `sitransparan-rt`).
- Details: `docs/architecture.md` §5, `docs/database.md`.

## 46.5 Feature Areas (discovered capabilities)

| Area | Capabilities |
|---|---|
| Bank Sampah | Master kategori & harga sampah dinamis, bagi hasil otomatis warga-pemuda, pencatatan setoran per KK terintegrasi data penduduk, buku tabungan KK, portal publik |
| Karang Taruna | Periode masa bakti (`active/archived/draft`), struktur pengurus inti & seksi bidang, konfigurasi dinamis (roles & sections JSONB), publik portal |
| Auth & IAM | login, register, list user tenants, switch tenant (`GET /auth/me` wired), user CRUD (admin), tenant CRUD (superadmin) |
| Demography | resident CRUD, family members, approve/reject, NIK encrypted (AES-256-GCM + HMAC lookup), master data rumah (`houses` & QR token) |
| Finance | **funds** (multi-kantong, `is_default`), fee categories, dues (record & verify, `status` filter), cash transactions (**append-only**), summary, CSV/PDF export via backend blob |
| Events | event CRUD (budget `budget` on list), RAB/budget (RAB card visible + toast), attachments/reports (proposal & LPJ), committee roles, sponsors, donation receipts, timeline transparency view |
| Aspirations | submit (public anonymous & internal), status + response (admin), community needs CRUD |
| Announcements & Documents | announcement CRUD (with multi-image `media_urls`, multi-file `file_urls`, category `pengumuman/kegiatan/santai/info`, comments toggle & citizen comments, detail modal on click, public endpoint `GET /t/{slug}/announcements/{id}` + infinite query), document CRUD (create/read/update/delete, PUT `/documents/{id}`) |
| Dashboard | summary metrics, financial report export via `GET /dashboard/reports/financial/export?format=csv|pdf` (blob) |
| Public Portal | `/kabar` (announcements, category filter, infinite scroll & detail modal), `/usulan` (aspirations), `/agenda` (events), `/karang-taruna`, `/bank-sampah` + legacy `/public/*` redirects; `/api/v1/t/{slug}/...` + KPI `feed_view/share_opened` |
| Social | reactions (`support/like/applause` 1-1) + polls (2–6 opsi) + `PollsPage` `/admin/polls` (create/close) + badge `Warga Baru → Utusan Warga` |
| Meetings | CRUD, visibility `public/internal/confidential` enforced, attendees/decisions/action-items |
| PWA | offline caching via Workbox + IndexedDB; navigasi HTML NetworkOnly tanpa index.html precache untuk mencegah stale view saat hard-refresh |
| Push | Web Push `push_subscriptions` (VAPID) — `GET /push/config`, `POST /push/subscribe` via `api` auth |

## 46.6 Routes & API

- **Frontend routes** (`frontend/src/App.tsx`): `/login`; public `/` (tenant→feed, platform→landing), `/kabar`, `/usulan`, `/agenda` (legacy `/public/*` redirects); protected `/admin`, `/admin/residents|financial|events|meetings|aspirations|announcements|polls` + `/admin/polls` (admin, 2–6 opsi), `/admin/users` (`SUPER_ADMIN`|`RT_ADMIN`) and `/admin/tenants` (`SUPER_ADMIN`) with legacy redirects (`/residents`→`/admin/residents` etc).
- **Backend API**: base `/api/v1`; public endpoints (health, auth login/register, public
  tenant resources, swagger) vs authenticated (Bearer JWT) vs ADMIN vs SUPERADMIN.
  Full verified inventory: `docs/api.md` and `backend/internal/delivery/http/openapi.yaml`
  (served at `GET /swagger/openapi.yaml`).

## 46.7 Environment & Credentials

- Stack: `make up` (build, wait for DB, run migrations). Targets: `up`, `migrate`, `down`,
  `restart`, `logs`, `clean`.
- Ports: frontend `3000`, backend `8081` (host) / `8080` (container), PostgreSQL `5432`,
  MinIO `9000`/`9001` (console), Traefik `80`/`8080` (dashboard). **Redis removed** — in-memory per-IP rate-limit (was `6379`, not used).
- Local wildcard subdomains (`*.openrt.local`) require `/etc/hosts` entries
  (e.g. `app.openrt.local`, `api.openrt.local`, `rt-003.openrt.local`).
- `TENANT_BASE_DOMAIN` (backend) and `VITE_TENANT_BASE_DOMAIN` (frontend build arg,
  `infrastructure/docker-compose.yml`) must match; dev default `openrt.local`,
  production `openrt.com`. Traefik labels interpolate `${TENANT_BASE_DOMAIN}` and use
  **v3 anchored HostRegexp** (v2 `{name:regex}` syntax matches nothing in Traefik v3).
  Traefik **must be v3.6+** on modern Docker daemons (older images pin Docker client API
  1.24 and fail with `client version 1.24 is too old`).
- **Seeded credentials** (verified against bcrypt hashes in migrations):

| Role | Email | Password |
|---|---|---|
| Super Admin | `abi@gmail.com` | `admin123` |
| Admin RT (tenant `sitransparan-rt`) | `admin@sitransparan.rt` | `password123` |
| Resident | self-register at `/login`, then admin assigns tenant via `/users` | — |

## 46.8 Test Commands & Existing Suites

```bash
# Backend (unit + integration + security)
cd backend && go build ./... && go vet ./... && go test ./...

# Frontend (typecheck + build)
cd frontend && npm run build

# E2E Playwright — requires the docker stack running at http://localhost:3000
npx playwright test                                        # headed (default config, slowMo 300)
npx playwright test --config=playwright.headless.config.ts # headless (CI)
```

- Backend security suite: `TestSecurity_*` in
  `backend/internal/delivery/http/security_integration_test.go` (cross-tenant matrix,
  role escalation, RBAC enforcement, superadmin account protection, public sanitization).
- E2E suite (`tests/e2e/`): **65 tests** — `auth/`, `public/`
  (termasuk `public-transparency`: endpoint publik meetings/financial-summary +
  share card modal), `admin/`
  (termasuk `dashboard-metrics`: koherensi angka + export CSV + window.print PDF),
  `announcements/` (termasuk `announcements-crud`: CRUD penuh + sinkronisasi portal
  publik + penyembunyian `residents_only` dari anonim; dan `multi-attachment`: multi-foto, multi-file, detail modal publik, batasan 10 items), `aspirations/` (termasuk
  `workflow.spec.ts`), `events/` (termasuk `events-workflow`: create → RAB persist via
  API → delete; filter status terverifikasi end-to-end), `meetings/`
  (termasuk `meetings-authz`: warga ditolak tulis, `visibility=confidential`
  ditegakkan server-side, isolasi lintas-hostname), `roles/{admin_rt,resident,
  superadmin,public,negative-authz}.spec.ts`, `superadmin/`, `users/`, **plus suite
  CRUD bisnis penuh dari audit E2E**: `residents/`, `finance/`,
  `isolation/tenant-isolation` (isolasi lintas tenant via hostname nyata
  `rt-003`/`rt-004`, termasuk direct URL & API 403/200), `roles/negative-authz`
  (warga ditolak di halaman/API admin; admin RT ditolak di superadmin).
  `helpers.ts` menyediakan login/parse Rupiah/NIK deterministik; konfigurasi headless
  memakai `--host-resolver-rules` (tanpa `/etc/hosts`).
- E2E creates its own users/tenants via the UI with timestamped emails (e.g.
  `warga_e2e_<ts>@test.local`) and does not seed into the database directly. Note that
  the existing specs do **not** delete the records they create, so test data accumulates
  across runs — treat leftover tenants/users as expected test residue, not application bugs.

## 46.9 Known Issues & Limitations (report honestly if encountered)

- **Frontend/backend API mismatches — FIXED** (verified `go vet` + `go test 104` + `vite build` + `tsc`):
  - `PATCH /financial/dues/{id}/verify` → **POST** `/financial/dues/{id}/verify` + `status` filter (`pending/verified/rejected`) wired `domain→repo→handler` + dashboard `pendingDues` benar
  - `POST /financial/upload-proof` → `/financial/upload` (with `proof_url`)
  - `PATCH /aspirations/{id}/status` → **PUT** `/aspirations/{id}`
  - `/community-needs` → `/needs` (GET/POST/PUT)
  - `/residents/{id}/family-members` → `/residents/{id}/family`
  - `GET /auth/me` — **WIRED 2026-08-28** (`AuthUsecase.GetMe` + `AuthHandler.Me` + `authMw(tenantMw(authMux))` + `useProfileQuery` fixed)
  - `GET /reactions`/`/polls` double prefix `/api/v1/api/v1/...` → fix ke `/reactions`, `/polls`, `/polls/{id}/vote` (was 404)
  - `POST /push/subscribe` `axios` tanpa `Authorization` → `api` (was 401)
  - `PUT /documents/{id}` 405 → tambah `UpdateDocument` domain/repo/usecase/handler (was 405)
  - `GET /t/resolve`, `GET /t/{slug}/events` (GET), `PUT /documents/{id}`, `status` filter docs, `funds` schema `target_amount→type`, `GET /events` `budget` — **fixed in `openapi.yaml`**
- Financial transactions are **append-only**; PUT/DELETE return 405 by design.
- **MinIO integrated (local dev, fixed after the stub era)**: `pkg/storage/minio` wraps
  minio-go; uploads persist real objects under a per-tenant key prefix
  (`<tenant-slug>/<category>/…`) in bucket `sitransparan-files` (auto-created with
  public-download policy at startup). Upload endpoints return host-reachable URLs via
  `MINIO_PUBLIC_URL` (default `http://localhost:9000`). If storage is unreachable the
  server degrades to metadata-only `/uploads/...` URLs. Production still needs presigned
  URLs / proxy reads and TLS review.
- No server-side token revocation (JWT valid until expiry).
- Rate limiter is **per client IP** (default 1000/100 per IP; auth endpoints stricter 20/5),
  `/health` & `/swagger/` exempt, `X-Forwarded-For` honored only from `TRUSTED_PROXY_IPS`
  (exact IP or CIDR). Set `TRUSTED_PROXY_IPS` in production behind Traefik/Nginx.
- Some handlers return 500 (`{"error":"record not found"}`) instead of 404 for cross-tenant
  writes to a non-existent resource (resident update/delete/approve) — cosmetic, no data impact.
- **FIXED in the second full E2E audit (50/50 green):**
  - `GET /events?status=...` — backend ignored the `status` query param (filter UI did
    nothing). Now filtered in handler → usecase → repo (count + list), unit-tested.
  - Meeting `visibility` was decorative — residents could read `confidential` meetings via
    `?visibility=confidential` or direct ID. Now enforced server-side: non-admins are forced
    to `public` on the list, denied 403 on detail, and action items of non-public meetings
    are hidden from them.
- **FIXED 2026-09-05 (AUDIT CHECKLIST 1.1, 1.3, 2.1, 2.2):**
  - Root platform landing: `GET /api/v1/public/tenants` added so anonymous root domain `https://<base_domain>/` lists active RTs without 401 interceptor redirection.
  - Subdomain 404 & ccTLD root redirect: 404 fallback page on unknown subdomain redirects correctly to full root platform domain via `getPlatformUrl('/')` (handles 3-part ccTLD such as `.web.id`, avoiding erroneous truncation to `.web.id`).
  - Superadmin audit mode: `TenantMiddleware` permits `superadmin` role bypass across tenant subdomains and platform routes when `TenantID` is nil.
  - Cross-subdomain login token propagation: `LoginPage` transmits token parameter during subdomain handoff and `useAuthStore` parses it on mount to bypass cross-subdomain cookie sandbox boundaries.
  - Vite HMR WebSocket: dev port configured to 443 for TLS reverse proxy/tunnel compatibility.
- **FIXED 2026-08-28 (GAP B1/B2/B5):**
  - Dashboard export — now uses backend blob `GET /dashboard/reports/financial/export?format=csv|pdf` (`dashboard.ts` `exportFinancialReport()` + loading/error) — no longer `window.print`/dummy CSV
  - Event attachments — proposal (`attachment_url`) dan LPJ (`report_url`) didukung di schema, admin card, form modal, dan public timeline
  - Event RAB — `GET /events` now embeds `budget` (usecase agregat `ListBudgetsByEventID`, card shows `RAB: {description} Estimasi/Realisasi`, modal prefills)
  - RAB toast — `EventsPage` `showToast` 3s + `EventBudgetModal` `onSaved`/`saveError` — no longer silent
  - Push `BroadcastTenant` now `WithTimeout 5s` + `media_urls` validated `http/https` max 10

## 46.10 Documentation Map (canonical)

The documentation is organized as an Obsidian Vault linked via `docs/00-MOC.md`:

| Topic | Primary Obsidian Document |
|---|---|
| Master Hub / MOC | `docs/00-MOC.md` |
| System Overview & Clean Architecture | `docs/01-architecture/system-overview.md` |
| Multi-Tenancy & Schema Isolation | `docs/01-architecture/multi-tenancy.md` |
| Auth, RBAC & NIK Encryption | `docs/01-architecture/authentication-and-rbac.md` |
| Subdomain & Host Routing | `docs/01-architecture/subdomain-and-routing.md` |
| Business Modules Specs (11 modules) | `docs/02-modules/*.md` |
| Database Catalog & Migrations 000001–000050 | `docs/03-database/schema-inventory.md`, `migrations-history.md` |
| API Contracts & OpenAPI 3.0 | `docs/04-api-contracts/api-inventory.md`, `openapi-spec.md` |
| Operations, Docker, Traefik & SDLC | `docs/05-operations-devops/*.md` |
| Playwright E2E & Backend Testing | `docs/06-testing-qa/*.md` |
| Frontend Apple Design & Bundle Performance | `docs/07-frontend-design/*.md` |
| Community Features & Payment Roadmaps | `docs/08-roadmaps/*.md` |

When creating or updating documentation during an audit, keep these canonical files as the
single source per topic; do not create parallel documents that duplicate them.

## 46.11 Aturan Perubahan Kode & Alur Promosi Lingkungan (Strict Workflow)

Semua agen dan developer **WAJIB** mengikuti alur promosi kode berikut:

1. **Seluruh perubahan kode HARUS dimulai dari branch `dev`**:
   - Dilarang keras melakukan commit atau edit kode langsung di branch `staging` atau `main` (production).
   - Fitur baru, bugfix, refactoring, atau pengujian harus dibuat dan diuji pertama kali di branch `dev`.
2. **Promosi ke Staging**:
   - Setelah branch `dev` teruji dan stabil, perubahan di-merge ke branch `staging` melalui PR/MR atau git merge terverifikasi.
   - Branch `staging` berfungsi untuk integrasi dan verifikasi fungsionalitas di lingkungan staging (*-staging.iscube.web.id).
3. **Promosi ke Production (`main`)**:
   - Setelah verifikasi di `staging` lulus tanpa regresi, perubahan dari `staging` di-merge ke branch `main` melalui PR/MR.
   - Branch `main` otomatis memicu pipeline CI/CD produksi (*.iscube.web.id).
4. **Strategi Integritas Data**:
   - Kebijakan data: data produksi adalah kebenaran operasional utama di masa mendatang.
   - Lingkungan `dev` dan `staging` berfungsi sebagai data tester/pengujian.

## 46.12 Mandat Pemeliharaan Dokumentasi Hidup (Living Documentation Governance)

Setiap agen AI dan pengembang yang bekerja pada repositori ini **WAJIB** menjaga sinkronisasi dokumentasi Obsidian Vault di `docs/`:

1. **Aturan Sinkronisasi Berkesinambungan (Continuous Sync Rule)**:
   - Dilarang keras menambah endpoint API, migration SQL baru, domain entity baru, atau komponen halaman frontend modular tanpa memperbarui catatan modul terkait di `docs/02-modules/`, `docs/03-database/`, atau `docs/04-api-contracts/`.
   - Perubahan arsitektur, peran, atau mekanisme keamanan wajib segera dicatat di `docs/01-architecture/`.
2. **Integritas Wikilink & Canvas**:
   - Setiap dokumen baru **wajib** memiliki frontmatter YAML (`title`, `description`, `tags`).
   - Setiap dokumen baru **wajib** ditautkan dari `docs/00-MOC.md` dan dihubungkan pada `docs/Architecture-Map.canvas`.
   - Dilarang meninggalkan broken wikilink (`[[...]]` yang tidak mengarah ke file nyata).
3. **Pilar Tunggal Terpercaya (Single Source of Truth)**:
   - Dilarang membuat file markdown acak di root repository atau root `docs/`. Seluruh catatan teknis baru harus ditempatkan pada salah satu dari 8 pilar yang tepat.
   - Jika modul bisnis baru lahir, buat berkas spesifikasi barunya di `docs/02-modules/<nama-fitur>.md` dan sinkronkan dengan handler backend, migration DB, dan UI frontend.
4. **Verifikasi Sebelum Merge / Promosi**:
   - Bagian dari Checklist Rilis (`docs/05-operations-devops/release-checklist.md`) adalah konfirmasi bahwa vault dokumentasi telah mencerminkan kondisi kode aktual pada branch yang bersangkutan.

## 46.13 Aturan Pustaka Komponen UI (Strict UI Component Library Adoption)

Dilarang keras menggunakan tag HTML primitif mentah jika komponen UI padanannya telah disediakan di `@/components/ui/`:

1. **Dropdown & Selection**: Dilarang menggunakan `<select>` dan `<option>` native. Wajib menggunakan `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` dari `@/components/ui/select`, atau `SearchableResidentSelect` untuk data warga.
2. **Form Controls**: Wajib menggunakan `<Button>`, `<Input>`, `<Textarea>`, `<Label>`, `<Checkbox>` dari `@/components/ui/`.
3. **Overlays & Data**: Wajib menggunakan `<Dialog>` (bukan dialog/alert JS native) dan `<Table>` untuk data tabular.
4. **Badges & Feedback**: Wajib menggunakan `<Badge>` untuk status pills dan komponen visual token yang seragam.
5. **Kebijakan Pemasangan Komponen Baru (Radix UI / Shadcn First)**:
   - Jika membutuhkan komponen interaktif yang belum tersedia di `@/components/ui/` (misalnya: `Tooltip`, `Popover`, `Accordion`, `DropdownMenu`, `Switch`, `Slider`):
     - **WAJIB** terlebih dahulu memasang paket resmi dari Radix UI (`@radix-ui/react-*`) dan membungkusnya menjadi komponen bergaya Shadcn di `@/components/ui/<nama>.tsx`.
     - **DILARANG** langsung jatuh menggunakan tag native HTML atau membuat komponen kustom mentah sebelum mengecek ketersediaan primitif di Radix UI. Tag native hanya boleh digunakan sebagai upaya darurat mutlak jika ekosistem Radix UI terbukti tidak memiliki padanannya.

