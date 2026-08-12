# Setup & Development — Sitransparan RT/RW

Panduan menjalankan project di lingkungan lokal. Semua perintah diverifikasi terhadap `Makefile`, `package.json`, dan konfigurasi Docker yang ada di repository.

---

## 1. Prasyarat

- Docker + Docker Compose (untuk stack penuh: PostgreSQL, MinIO, Redis, Traefik, Backend, Frontend)
- Go 1.25+ (lihat `backend/go.mod`) untuk menjalankan backend langsung / `go test`
- Node.js 18+ & npm (untuk frontend langsung)
- `make` (untuk target Makefile)

## 2. Environment Variables

Salin `.env.example` ke `.env` (nilai default sudah aman untuk development):

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
| `REDIS_PORT` | `6379` | Port Redis (container saja; Redis tidak dipakai backend) |

Variabel backend (dibaca langsung dari environment, lihat `backend/pkg/config/config.go`):

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `8081` | Port HTTP backend |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `localhost` / `5432` / `postgres` / `postgres` / `transparansi_rt` | Koneksi PostgreSQL (bisa diganti `DATABASE_URL`/`DB_URL` sekaligus) |
| `DB_SSLMODE` | `disable` | SSL mode |
| `JWT_SECRET` | **(wajib — tidak ada default)** | Secret penandatangan JWT. **WAJIB diset** minimal 32 karakter; backend menolak start jika kosong/terlalu pendek atau memakai nilai default lama yang sudah publik. Generate: `openssl rand -base64 48`. Isi di `infrastructure/.env` untuk stack Docker (lihat §3). Jangan pernah memakai secret yang sama di lingkungan berbeda |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_USE_SSL` | — | Dikonfigurasi di docker-compose |
| `TENANT_BASE_DOMAIN` | `openrt.local` | Domain dasar untuk subdomain tenant (`<slug>.<TENANT_BASE_DOMAIN>`). Dev `openrt.local`, produksi `openrt.com`. Tidak boleh hardcode; backend membaca env ini (`config.go`) |
| `RATE_LIMIT_CAPACITY` | `1000` | Token bucket **per client IP** (kapasitas). Satu client tidak bisa 429 seluruh API |
| `RATE_LIMIT_REFILL` | `100` | Isi ulang bucket per detik per IP |
| `AUTH_RATE_LIMIT_CAPACITY` | `20` | Budget per IP untuk `/auth/login` & `/auth/register` (permukaan brute-force) |
| `AUTH_RATE_LIMIT_REFILL` | `5` | Isi ulang per detik untuk endpoint auth |
| `TRUSTED_PROXY_IPS` | *(kosong)* | Reverse proxy di depan backend (exact IP **atau CIDR**, pisah koma) yang `X-Forwarded-For`-nya dipercaya untuk per-IP rate limiting. **Wajib di produksi** di belakang Traefik/Nginx — jika kosong semua client terhitung sebagai satu IP proxy |

Variabel frontend (build-time, Vite `VITE_*`):

| Variabel | Default | Keterangan |
|---|---|---|
| `VITE_TENANT_BASE_DOMAIN` | `openrt.local` | Dipakai `frontend/src/utils/tenant.ts` untuk menurunkan slug tenant dari hostname. **Harus sama** dengan `TENANT_BASE_DOMAIN` backend. Disuntikkan via build arg Docker (`Dockerfile.frontend`) |

## 3. Menjalankan dengan Docker (disarankan)

```bash
> **PENTING**: `JWT_SECRET` wajib diset. Untuk stack Docker, simpan di `infrastructure/.env` (sudah di-gitignore) atau ekspor di environment: `openssl rand -base64 48` → tempel ke `JWT_SECRET=...` di `infrastructure/.env`. Compose akan gagal dengan pesan jelas jika tidak ada — ini disengaja (fail-closed) agar deployment tidak pernah berjalan dengan secret yang diketahui publik.

```bash
make up        # Build + jalankan semua service, tunggu DB siap, lalu jalankan migrasi
make migrate   # Jalankan migrasi SQL (backend/migrations/*.up.sql) ke database
make logs      # Stream log semua service
make restart   # down + up
make down      # Hentikan service
make clean     # Hentikan service & hapus volume data (reset total)
```

Stack development (`infrastructure/docker-compose.yml`):

| Service | Port host | Keterangan |
|---|---|---|
| Traefik | `80`, `8080` (dashboard) | Reverse proxy wildcard subdomain |
| PostgreSQL | `5432` | Database |
| Redis | `6379` | (tidak dipakai backend) |
| MinIO | `9000`, `9001` (console) | Object storage |
| Backend | `8081 → 8080` | Go API |
| Frontend | `3000 → 80` | React PWA (Nginx) |

> **Traefik v3.6+ wajib** (`image: traefik:3.6`). Versi ≤ v3.5 membundel docker client yang pin API 1.24 sehingga gagal melawan Docker daemon modern (error `client version 1.24 is too old`) dan router wildcard tidak pernah termuat. Label `HostRegexp` memakai sintaks v3 (regex ber-anchor, bukan template `{name:regex}` v2).

Migrasi juga otomatis dijalankan saat volume database pertama kali dibuat (mount `/docker-entrypoint-initdb.d`).

## 4. Menjalankan Backend Langsung (tanpa Docker)

```bash
cd backend
go run ./cmd/server
# Backend di http://localhost:8081
```

Backend hanya butuh PostgreSQL yang berjalan (`make up` untuk service infra saja, atau jalankan `docker-compose.yml` level root yang berisi postgres + minio).

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

Development mendukung tenant subdomain (`rt-003.openrt.local`, `rt-004.openrt.local`, ...). Tambahkan ke `/etc/hosts`:

```text
127.0.0.1 app.openrt.local
127.0.0.1 api.openrt.local
127.0.0.1 openrt.local
127.0.0.1 rt-003.openrt.local
127.0.0.1 rt-004.openrt.local
```

Jika `TENANT_BASE_DOMAIN` diganti (mis. `localhost.test`), sesuaikan entri dan build arg `VITE_TENANT_BASE_DOMAIN`.

**Backend adalah security boundary**: wildcard DNS hanya routing. Hostname apa pun tetap di-lookup ke tabel `tenants`, harus exist + `status='active'`, dan tenant JWT harus cocok dengan hostname — jika tidak → 403 (lihat [architecture.md](./architecture.md) §5.2).

> Catatan mode `npm run dev` (Vite): proxy `/api` di `vite.config.ts` **tidak** mengubah header `Host` (`changeOrigin` default false), jadi backend tetap menerima hostname asli (mis. `rt-003.localhost`) dan penegakan hostname tetap berlaku. Pastikan `VITE_TENANT_BASE_DOMAIN` diset (mis. `VITE_TENANT_BASE_DOMAIN=localhost npm run dev`) agar slug turunan frontend konsisten dengan backend.

Tenant baru tidak butuh perubahan source code: cukup buat tenant lewat SuperAdmin (`/superadmin/tenants` atau API) → schema `tenant_<slug>` diprovisikan otomatis dan tenant langsung routable.

## 7. Akun Default (Seed — diverifikasi dari migrasi)

| Role | Email | Password |
|---|---|---|
| Super Admin (platform) | `superadmin@platform.local` | `admin123` |
| Super Admin (legacy) | `admin@gmail.com` | `admin123` |
| Admin RT default (tenant `sitransparan-rt`) | `admin@sitransparan.rt` | `password123` |
| Resident | daftar mandiri lewat `/login` (registrasi hanya membuat user; mapping tenant dilakukan Admin RT via halaman `/users`) | — |

Password diverifikasi terhadap bcrypt hash pada migrasi `000001` dan `000007`.

## 8. URL & Access Points

| Tujuan | URL |
|---|---|
| Frontend portal | `http://localhost:3000` |
| Backend REST API | `http://localhost:8081/api/v1` |
| Swagger UI | `http://localhost:8081/swagger/` |
| OpenAPI spec | `http://localhost:8081/swagger/openapi.yaml` |
| Traefik dashboard | `http://localhost:8080` |
| MinIO console | `http://localhost:9001` (`minioadmin` / `minioadmin`) |
| Portal tenant (lewat Traefik :80) | `http://rt-003.openrt.local/` (butuh entri `/etc/hosts`) |

## 9. Test & Build

```bash
# Backend
cd backend
go build ./...
go vet ./...
go test ./...

# Frontend
cd frontend
npm run build      # termasuk typecheck (tsc)

# E2E Playwright (butuh stack docker berjalan di localhost:3000)
npx playwright test                          # headed (sesuai playwright.config.ts)
npx playwright test --config=playwright.headless.config.ts   # headless
```

Lihat [testing.md](./testing.md) untuk detail test suite.
