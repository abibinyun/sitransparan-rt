# Deployment — Sitransparan RT/RW

Dokumen ini berdasarkan konfigurasi deployment aktual di repository.

---

## 1. Mode Development (Local Docker)

Stack penuh di `infrastructure/docker-compose.yml`:

```bash
make up     # build + up + tunggu DB + migrasi
```

Services: **Traefik 3.6+**, **PostgreSQL 16**, **MinIO**, **Backend** (Go 1.25, port host `8081`), **Frontend** (Nginx, port host `3000`). **Redis sudah dihapus** — rate-limit in-memory per-IP (was `6379`).

- Frontend container proxy `/api/` ke backend (`frontend/nginx.conf`).
- Backend hanya start setelah PostgreSQL dan MinIO healthy (`depends_on: condition: service_healthy`).
- Migrasi 000001–000020 berjalan otomatis saat volume DB pertama dibuat (`/docker-entrypoint-initdb.d`), dan manual via `make migrate`.

### Wildcard subdomain (`*.<TENANT_BASE_DOMAIN>`)

Domain dasar via env `TENANT_BASE_DOMAIN` (dev `openrt.local`) — **tidak hardcode**. Traefik routing (labels, interpolasi `${TENANT_BASE_DOMAIN}`):

- `api.<base>` / `localhost` → backend.
- `app.<base>` / `<base>` / `<subdomain>.<base>` → frontend.

Label `HostRegexp` **sintaks Traefik v3** anchored regex (mis. `^[a-z0-9-]+\.openrt\.local$`) — template v2 `{subdomain:[a-z0-9-]+}` tidak match di v3. Anchor mencegah suffix-trick (`rt-003.openrt.local.attacker.com`).

Untuk subdomain lokal, tambah ke `/etc/hosts`:

```text
127.0.0.1 app.openrt.local
127.0.0.1 api.openrt.local
127.0.0.1 rt-003.openrt.local
```

Tenant baru otomatis domain `<slug>.<TENANT_BASE_DOMAIN>` (lihat `auth_usecase.go: CreateTenant`). **Wildcard DNS hanya routing**: tenant existence + status + auth tetap backend (`TenantMiddleware`).

## 2. Mode Produksi (Sederhana)

`docker-compose.prod.yml` komposisi minimal tanpa Traefik:

- PostgreSQL (`platform-rt-db`, `5432`)
- MinIO (`platform-rt-minio`, `9000`/`9001`)
- Backend (`platform-rt-backend`, `8080`)
- Frontend (`platform-rt-frontend`, `80`)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> `.env.example` root hanya vars PG/MinIO. Produksi wajib `JWT_SECRET` kuat + ganti password default. **Wajib:** `TRUSTED_PROXY_IPS` ke IP/CIDR proxy (rate-limit per-IP; tanpa ini semua via proxy dihitung satu IP). Tuning: `RATE_LIMIT_CAPACITY`, `RATE_LIMIT_REFILL`, `AUTH_RATE_LIMIT_CAPACITY`, `AUTH_RATE_LIMIT_REFILL` (default 1000/100 dan 20/5).

## 3. Mode Produksi Target (Wildcard `*.openrt.com`)

```text
*.openrt.com (wildcard DNS A/AAAA)
  → Traefik (router wildcard, websecure)
  → Frontend (Nginx) → Backend (proxy /api)
  → TenantMiddleware (hostname → tenant lookup → active → match JWT)
  → schema tenant_<slug>
```

Persyaratan operator:

1. **Wildcard DNS** `*.openrt.com` → IP server.
2. **TLS wildcard** `*.openrt.com` (Let's Encrypt wildcard butuh **DNS-01 challenge**).
3. **Traefik v3.6+** dengan router wildcard anchored + `websecure` + `tls.certresolver`/file.
4. **Konfig**: `TENANT_BASE_DOMAIN=openrt.com` (backend) dan build arg `VITE_TENANT_BASE_DOMAIN=openrt.com` (frontend) — harus sama.
5. **Registrasi tenant** via SuperAdmin (no source change): buat → schema provisi → `active` → routable. `inactive` → hostname ditolak (403/404).
6. **Per-IP rate limiting**: `TRUSTED_PROXY_IPS` ke IP/CIDR Traefik (mis. `172.16.0.0/12`). `/health` & `/swagger/` exempt; auth budget ketat 20/5.

Jika infra prod belum tersedia, tandai `UNTESTED/BLOCKED`.

## 4. Docker Images

| Dockerfile | Isi |
|---|---|
| `infrastructure/Dockerfile.backend` | Multi-stage Go (compose dev) |
| `Dockerfile.backend` (root) | Untuk `docker-compose.prod.yml` |
| `infrastructure/Dockerfile.frontend` | Vite → Nginx (compose dev); arg `VITE_TENANT_BASE_DOMAIN` |
| `Dockerfile.frontend` (root) | Untuk `docker-compose.prod.yml` |

## 5. Environment untuk Backend di Docker

Kompose suntik ke backend:

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `MINIO_PUBLIC_URL`, `MINIO_BUCKET`, `PORT` (internal `8080`), `TENANT_BASE_DOMAIN` (default `openrt.local`), `TRUSTED_PROXY_IPS`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `NIK_ENCRYPTION_KEY`, `JWT_SECRET`, dan di prod juga `RATE_LIMIT_*`/`AUTH_RATE_LIMIT_*`.

Backend baca `PORT`, `DB_*`, `DATABASE_URL`/`DB_URL`, `DB_SSLMODE`, `JWT_SECRET`, `NIK_ENCRYPTION_KEY`, `VAPID_*`, `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`, `TRUSTED_PROXY_IPS`, `TENANT_BASE_DOMAIN` (lihat `backend/pkg/config/config.go`).
