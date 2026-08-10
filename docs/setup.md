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
| `JWT_SECRET` | `sitransparan-secret-key-change-in-prod` | Secret penandatangan JWT — **ganti di produksi** |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_USE_SSL` | — | Dikonfigurasi di docker-compose |

## 3. Menjalankan dengan Docker (disarankan)

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

## 6. Akun Default (Seed — diverifikasi dari migrasi)

| Role | Email | Password |
|---|---|---|
| Super Admin (platform) | `superadmin@platform.local` | `admin123` |
| Super Admin (legacy) | `admin@gmail.com` | `admin123` |
| Admin RT default (tenant `sitransparan-rt`) | `admin@sitransparan.rt` | `password123` |
| Resident | daftar mandiri lewat `/login` (registrasi hanya membuat user; mapping tenant dilakukan Admin RT via halaman `/users`) | — |

Password diverifikasi terhadap bcrypt hash pada migrasi `000001` dan `000007`.

## 7. URL & Access Points

| Tujuan | URL |
|---|---|
| Frontend portal | `http://localhost:3000` |
| Backend REST API | `http://localhost:8081/api/v1` |
| Swagger UI | `http://localhost:8081/swagger/` |
| OpenAPI spec | `http://localhost:8081/swagger/openapi.yaml` |
| Traefik dashboard | `http://localhost:8080` |
| MinIO console | `http://localhost:9001` (`minioadmin` / `minioadmin`) |

## 8. Test & Build

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
