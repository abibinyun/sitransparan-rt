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

### Wildcard subdomain (`*.<TENANT_BASE_DOMAIN>`)

Domain dasar dikonfigurasi lewat env `TENANT_BASE_DOMAIN` (dev default `openrt.local`, lihat `.env.example`) — **tidak ada domain produksi hardcoded**. Traefik routing (labels pada service, memakai interpolasi `${TENANT_BASE_DOMAIN}`):

- `api.<base>` / `localhost` → backend.
- `app.<base>` / `<base>` / `<subdomain>.<base>` → frontend.

Label `HostRegexp` memakai **sintaks Traefik v3** (regex ber-anchor, mis. `^[a-z0-9-]+\.openrt\.local$`) — sintaks template v2 `{subdomain:[a-z0-9-]+}` tidak cocok apa pun di v3. Anchor `^...$` mencegah hostname suffix-trick (`rt-003.openrt.local.attacker.com`) masuk router.

Untuk mengakses subdomain tenant lokal, tambahkan ke `/etc/hosts`:

```text
127.0.0.1 app.openrt.local
127.0.0.1 api.openrt.local
127.0.0.1 rt-003.openrt.local
```

Tenant baru otomatis mendapat domain default `<slug>.<TENANT_BASE_DOMAIN>` (lihat `auth_usecase.go: CreateTenant`). **Wildcard DNS hanya routing**: tenant existence + status + authorization tetap diverifikasi backend (`TenantMiddleware`).

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

## 3. Mode Produksi Target (Wildcard `*.openrt.com`)

Arsitektur target produksi dengan wildcard DNS + TLS:

```text
*.openrt.com (wildcard DNS A/AAAA)
  → Traefik (router wildcard, entrypoint websecure)
  → Frontend (Nginx) → Backend (proxy /api)
  → TenantMiddleware (hostname → tenant lookup → status active → match JWT)
  → schema tenant_<slug>
```

Persyaratan yang **tidak otomatis** dan harus disiapkan operator:

1. **Wildcard DNS** `*.openrt.com` → IP server.
2. **TLS wildcard certificate** `*.openrt.com`. Dengan Let's Encrypt, wildcard memerlukan **DNS-01 challenge** (bukan HTTP-01); pastikan provider DNS didukung. Alternatif: sertifikat wildcard dari CA lain (mis. ZeroSSL) dipasang sebagai file TLS di Traefik.
3. **Traefik v3.6+** dengan router wildcard ber-anchor (lihat §1) + entrypoint `websecure` dan `tls.certresolver`/certificate file.
4. **Konfigurasi aplikasi**: `TENANT_BASE_DOMAIN=openrt.com` (backend) dan build arg `VITE_TENANT_BASE_DOMAIN=openrt.com` (frontend) — keduanya harus sama.
5. **Registrasi tenant** lewat SuperAdmin (no source-code change): buat tenant → schema diprovisikan → status `active` → langsung routable. Nonaktifkan tenant (`status=inactive`) → seluruh hostname-nya ditolak (403/404) walaupun wildcard DNS masih aktif.

Jika infrastruktur produksi belum tersedia untuk pengujian nyata, tandai bagian ini `UNTESTED/BLOCKED` — jangan diklaim terverifikasi.

## 4. Docker Images

| Dockerfile | Isi |
|---|---|
| `infrastructure/Dockerfile.backend` | Multi-stage build backend Go (digunakan kompose dev) |
| `Dockerfile.backend` (root) | Digunakan `docker-compose.prod.yml` |
| `infrastructure/Dockerfile.frontend` | Build Vite → Nginx (digunakan kompose dev); menerima build arg `VITE_TENANT_BASE_DOMAIN` |
| `Dockerfile.frontend` (root) | Digunakan `docker-compose.prod.yml` |

## 5. Environment untuk Backend di Docker

Kompose menyuntikkan variabel berikut ke service backend:

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `PORT` (internal `8080`), `REDIS_HOST`/`REDIS_PORT` (dev), `TENANT_BASE_DOMAIN` (dev default `openrt.local`).

Backend membaca `PORT`, `DB_*`, `DATABASE_URL`/`DB_URL`, `DB_SSLMODE`, `JWT_SECRET` (lihat `backend/pkg/config/config.go`).
