# Setup & Development — Sitransparan RT/RW

Panduan menjalankan project di lingkungan lokal. Semua perintah diverifikasi terhadap `Makefile`, `package.json`, dan konfigurasi Docker.

---

## 1. Prasyarat

- Docker + Docker Compose (untuk stack: PostgreSQL, MinIO, Traefik, Backend, Frontend)
- Go 1.25+ (lihat `backend/go.mod`) untuk `go test` / `go run`
- Node.js 18+ & npm (frontend)
- `make`

## 2. Environment Variables

Salin `.env.example` ke `.env` (default aman untuk dev):

| Variabel | Default | Keterangan |
|---|---|---|
| `POSTGRES_USER` | `postgres` | User PostgreSQL |
| `POSTGRES_PASSWORD` | `postgres` | Password PostgreSQL |
| `POSTGRES_DB` | `transparansi_rt` | Database |
| `POSTGRES_PORT` | `5432` | Port PostgreSQL |
| `MINIO_ROOT_USER` | `minioadmin` | User MinIO |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | Password MinIO |
| `MINIO_PORT` | `9000` | Port MinIO S3 |
| `MINIO_CONSOLE_PORT` | `9001` | Port console MinIO |

Variabel backend (`backend/pkg/config/config.go`):

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `8081` | Port HTTP backend |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `localhost` / `5432` / `postgres` / `postgres` / `transparansi_rt` | Koneksi PG (bisa `DATABASE_URL`/`DB_URL`) |
| `DB_SSLMODE` | `disable` | SSL mode |
| `JWT_SECRET` | **(wajib)** | Secret JWT HS256. **Wajib** ≥32 char; backend menolak start jika kosong/pendek/nilai publik lama. `openssl rand -base64 48` |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_USE_SSL` / `MINIO_PUBLIC_URL` / `MINIO_BUCKET` | — | Storage (docker-compose set; `MINIO_PUBLIC_URL` default `http://localhost:9000` untuk URL host-reachable; bucket `sitransparan-files`). Di prod wajib URL publik HTTPS valid. |
| `TENANT_BASE_DOMAIN` | `openrt.local` | Domain dasar subdomain tenant (`<slug>.<TENANT_BASE_DOMAIN>`). Dev `openrt.local`, staging `iscube.web.id`, prod `openrt.com`. Tidak hardcode |
| `NIK_ENCRYPTION_KEY` | `sitransparan-nik-encrypt-key-32b` (dev fallback) | **Tepat 32 bytes** AES-256-GCM. Dev boleh fallback; **prod panic jika ≠32 bytes** (fail-closed). Generate: `openssl rand -base64 32 \| head -c 32` |
| `NIK_HMAC_SECRET` | `sitransparan-nik-hmac-secret-key` (dev fallback) | **Min. 32 char** HMAC lookup. Prod panic jika kosong saat `APP_ENV=production`. Generate: `openssl rand -base64 32` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | *(kosong)* | Web Push. Kosong → push disabled graceful. Generate: `npx web-push generate-vapid-keys` |
| `RATE_LIMIT_CAPACITY` | `1000` | Token bucket per-IP |
| `RATE_LIMIT_REFILL` | `100` | Refill per detik per IP |
| `AUTH_RATE_LIMIT_CAPACITY` | `20` | Budget per-IP `/auth/login` & `/register` |
| `AUTH_RATE_LIMIT_REFILL` | `5` | Refill auth per detik |
| `TRUSTED_PROXY_IPS` | *(kosong)* | IP/CIDR proxy yang `X-Forwarded-For`-nya dipercaya. **Wajib di prod** di belakang Traefik/Nginx |

Variabel frontend (build-time, Vite `VITE_*`):

| Variabel | Default | Keterangan |
|---|---|---|
| `VITE_TENANT_BASE_DOMAIN` | `openrt.local` | `frontend/src/utils/tenant.ts` untuk slug dari hostname. **Harus sama** dengan `TENANT_BASE_DOMAIN` backend. Via build arg `Dockerfile.frontend` |

## 3. Menjalankan dengan Docker (disarankan)

```bash
> **PENTING**: `JWT_SECRET` wajib diset di `infrastructure/.env` (gitignore) atau env: `openssl rand -base64 48` → `JWT_SECRET=...`. Compose gagal dengan pesan jelas jika tidak ada.

```bash
make up        # Build + jalankan semua service, tunggu DB siap, lalu migrasi
make migrate   # Jalankan migrasi SQL (backend/migrations/*.up.sql) 000001–000020
make logs      # Stream log
make restart   # down + up
make down      # Hentikan
make clean     # Hentikan & hapus volume (reset total)
```

Stack development (`infrastructure/docker-compose.yml`):

| Service | Port host | Keterangan |
|---|---|---|
| Traefik | `80`, `8080` (dashboard) | Reverse proxy wildcard subdomain (v3.6+) |
| PostgreSQL | `5432` | Database (20 migrasi, 23+ tabel tenant) |
| MinIO | `9000`, `9001` (console) | Object storage (`sitransparan-files`, per-tenant prefix) |
| Backend | `8081 → 8080` | Go API (depends_on postgres+minio healthy) |
| Frontend | `3000 → 80` | React PWA (Nginx) |

> **Traefik v3.6+ wajib**. ≤ v3.5 pin Docker API 1.24 → `client version 1.24 is too old`. Label `HostRegexp` v3 anchored regex (bukan template v2). **Redis sudah dihapus** — rate-limit in-memory per-IP (was `6379`).

Migrasi otomatis saat volume DB pertama dibuat (`/docker-entrypoint-initdb.d`).

## 4. Menjalankan Backend Langsung (tanpa Docker)

```bash
cd backend
go run ./cmd/server
# Backend di http://localhost:8081
```

Butuh PostgreSQL berjalan (via `make up` infra atau `docker-compose.yml` root).

## 5. Menjalankan Frontend Langsung (tanpa Docker)

```bash
cd frontend
npm install
npm run dev
# Vite dev server, /api di-proxy ke http://localhost:8081
```

Build produksi:

```bash
npm run build   # tsc && vite build (typecheck + bundle + PWA)
npm run preview
```

## 6. Tenant Subdomain Lokal

```text
127.0.0.1 app.openrt.local
127.0.0.1 api.openrt.local
127.0.0.1 openrt.local
127.0.0.1 rt-003.openrt.local
127.0.0.1 rt-004.openrt.local
```

Jika `TENANT_BASE_DOMAIN` diganti, sesuaikan entri + build arg `VITE_TENANT_BASE_DOMAIN`. Backend tetap verify: wildcard DNS hanya routing; hostname → lookup `tenants` (exist+active) + match JWT → else 403.

> Vite `npm run dev`: proxy `/api` tidak ubah `Host` (`changeOrigin` false), backend terima hostname asli. Set `VITE_TENANT_BASE_DOMAIN=localhost npm run dev` agar slug konsisten.

Tenant baru: buat via SuperAdmin (`/admin/tenants` atau API) → schema `tenant_<slug>` auto-provisi + langsung routable.

## 7. Akun Default (Seed — verifikasi bcrypt migrasi)

| Role | Email | Password |
|---|---|---|
| Super Admin | `abi@gmail.com` | `admin123` |
| Admin RT default (tenant `sitransparan-rt`) | `admin@sitransparan.rt` | `password123` |
| Resident | daftar mandiri lewat `/login` (register tanpa tenant; mapping via `/admin/users`) | — |

## 8. URL & Access Points

| Tujuan | URL |
|---|---|
| Frontend portal | `http://localhost:3000` |
| Backend REST API | `http://localhost:8081/api/v1` |
| Swagger UI | `http://localhost:8081/swagger/` |
| OpenAPI spec | `http://localhost:8081/swagger/openapi.yaml` |
| Traefik dashboard | `http://localhost:8080` |
| MinIO console | `http://localhost:9001` (`minioadmin` / `minioadmin`) |
| Portal tenant (via Traefik :80) | `http://rt-003.openrt.local/` (butuh `/etc/hosts`) |

## 9. Test & Build

```bash
# Backend
cd backend
go build ./...
go vet ./...
go test ./...

# Frontend
cd frontend
npm run build      # termasuk tsc

# E2E Playwright (butuh stack docker di localhost:3000)
npx playwright test                          # headed (slowMo 300)
npx playwright test --config=playwright.headless.config.ts   # headless
```

Lihat [testing.md](./testing.md) untuk detail (104+7, E2E 64).
