# Deployment — Sitransparan RT/RW

Dokumen ini berdasarkan konfigurasi deployment aktual di repository.

---

## 1. Mode Development (Local Docker)

Stack penuh di `infrastructure/docker-compose.yml`:

```bash
make up     # build + up + tunggu DB + migrasi
```

Services: **Traefik**, **PostgreSQL 16**, **Redis**, **MinIO**, **Backend** (Go, port host `8081`), **Frontend** (Nginx, port host `3000`).

- Frontend container me-*proxy* `/api/` ke backend (`frontend/nginx.conf`).
- Backend hanya start setelah PostgreSQL, Redis, dan MinIO healthy (`depends_on: condition: service_healthy`).
- Migrasi berjalan otomatis saat volume database pertama dibuat (`/docker-entrypoint-initdb.d`), dan manual via `make migrate`.

### Wildcard subdomain (`*.openrt.local`)

Traefik routing (labels pada service):

- `api.openrt.local` / `localhost` → backend.
- `app.openrt.local` / `openrt.local` / `<subdomain>.openrt.local` → frontend.

Untuk mengakses subdomain tenant lokal, tambahkan ke `/etc/hosts`:

```text
127.0.0.1 app.openrt.local
127.0.0.1 api.openrt.local
127.0.0.1 rt-003.openrt.local
```

Tenant baru otomatis mendapat domain default `<slug>.openrt.local` (lihat `auth_usecase.go: CreateTenant`).

## 2. Mode Produksi (Sederhana)

`docker-compose.prod.yml` menyediakan komposisi minimal produksi tanpa Traefik/Redis:

- PostgreSQL (container `platform-rt-db`, port `5432`)
- MinIO (container `platform-rt-minio`, port `9000`/`9001`)
- Backend (`platform-rt-backend`, port `8080`)
- Frontend (`platform-rt-frontend`, port `80`)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> Catatan: `.env.example` level root hanya berisi variabel PostgreSQL/MinIO. Untuk produksi wajib set `JWT_SECRET` yang kuat di environment backend dan mengganti password default.

## 3. Docker Images

| Dockerfile | Isi |
|---|---|
| `infrastructure/Dockerfile.backend` | Multi-stage build backend Go (digunakan kompose dev) |
| `Dockerfile.backend` (root) | Digunakan `docker-compose.prod.yml` |
| `infrastructure/Dockerfile.frontend` | Build Vite → Nginx (digunakan kompose dev) |
| `Dockerfile.frontend` (root) | Digunakan `docker-compose.prod.yml` |

## 4. Environment untuk Backend di Docker

Kompose menyuntikkan variabel berikut ke service backend:

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `PORT` (internal `8080`), `REDIS_HOST`/`REDIS_PORT` (dev).

Backend membaca `PORT`, `DB_*`, `DATABASE_URL`/`DB_URL`, `DB_SSLMODE`, `JWT_SECRET` (lihat `backend/pkg/config/config.go`).
