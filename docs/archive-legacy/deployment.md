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

## 2. Mode Produksi & Konfigurasi Lengkap

### 2.1 Checklist Environment Variables Wajib (Production Checklist)

Semua variabel berikut **wajib** dikonfigurasi saat deploy ke staging maupun production agar sistem aman dan tidak panic saat startup:

| Variabel | Lingkup | Tipe / Format | Keterangan & Cara Generate |
|---|---|---|---|
| `JWT_SECRET` | Backend | String (Min. 32 char) | **WAJIB KRUSIAL**. Rahasia penandatanganan token JWT. Server menolak start jika kosong/default. Generate: `openssl rand -base64 48` |
| `NIK_ENCRYPTION_KEY` | Backend | String (Tepat 32 bytes) | **WAJIB**. Kunci enkripsi AES-256-GCM NIK/identitas penduduk. Wajib 32 karakter jika `APP_ENV=production`. Generate: `openssl rand -base64 32 \| head -c 32` |
| `NIK_HMAC_SECRET` | Backend | String (Min. 32 char) | **WAJIB**. Kunci hashing HMAC pencarian NIK terenkripsi. Generate: `openssl rand -base64 32` |
| `TENANT_BASE_DOMAIN` | Backend | String (FQDN/CSV) | Domain induk multi-tenant (contoh: `iscube.web.id` atau `openrt.com`). |
| `VITE_TENANT_BASE_DOMAIN` | Frontend (Build Arg) | String (FQDN) | Wajib sama persis dengan `TENANT_BASE_DOMAIN` agar frontend dapat menurunkan tenant slug dari URL browser. |
| `TRUSTED_PROXY_IPS` | Backend | CSV (IP / CIDR) | IP/subnet reverse proxy (Nginx/Traefik/Docker gateway, mis. `172.16.0.0/12`) agar header `X-Forwarded-For` diakui untuk per-IP rate-limiting. |
| `POSTGRES_USER` | DB & Backend | String | Akun database PostgreSQL (ganti dari `postgres`). |
| `POSTGRES_PASSWORD` | DB & Backend | String | Password kuat database PostgreSQL (ganti dari default). |
| `POSTGRES_DB` | DB & Backend | String | Nama database (mis. `platform_rt` atau `transparansi_rt`). |
| `MINIO_ROOT_USER` | MinIO & Backend | String | Akun admin MinIO/S3 (ganti dari `minioadmin`). |
| `MINIO_ROOT_PASSWORD` | MinIO & Backend | String | Password admin MinIO/S3 (ganti dari `minioadmin`). |
| `MINIO_ENDPOINT` | Backend | `host:port` | Endpoint koneksi internal backend ke MinIO (mis. `minio:9000`). |
| `MINIO_PUBLIC_URL` | Backend | URL | Base URL publik yang diakses browser warga untuk unduh berkas/foto (mis. `https://storage.iscube.web.id` atau `https://minio.openrt.com`). |
| `MINIO_USE_SSL` | Backend | Boolean | Set `true` jika MinIO publik memakai HTTPS. |
| `VAPID_PUBLIC_KEY` | Backend | String | Kunci publik Web Push Notification (opsional, nonaktif jika kosong). Generate: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Backend | String | Kunci privat Web Push Notification. |
| `VAPID_SUBJECT` | Backend | `mailto:...` | Kontak email pengirim push (mis. `mailto:admin@openrt.com`). |
| `RATE_LIMIT_CAPACITY` | Backend | Integer | Kapasitas token bucket rate-limit global per IP (default `1000`). |
| `RATE_LIMIT_REFILL` | Backend | Float | Kecepatan refill token per detik (default `100`). |
| `AUTH_RATE_LIMIT_CAPACITY` | Backend | Integer | Kapasitas rate-limit khusus endpoint auth login/register (default `20`). |
| `AUTH_RATE_LIMIT_REFILL` | Backend | Float | Kecepatan refill token auth per detik (default `5`). |

---

### 2.2 Mode Produksi Docker Compose

File `infrastructure/docker-compose.prod.yml` digunakan untuk runtime server produksi:

```bash
docker compose -f infrastructure/docker-compose.prod.yml up -d --build
```

Layanan yang dijalankan:
- **PostgreSQL 16** (`platform-rt-db`, port internal `5432`)
- **MinIO S3 Storage** (`platform-rt-minio`, port `9000` API & `9001` Console)
- **Backend Go** (`platform-rt-backend`, port `8080`)
- **Frontend Nginx** (`platform-rt-frontend`, port `80`)

---

## 3. Mode Produksi Target (Wildcard DNS & Reverse Proxy)

Arsitektur lalu lintas publik:

```text
*.iscube.web.id / *.openrt.com (wildcard DNS A/AAAA)
  → Reverse Proxy (Traefik / Nginx / Cloudflare SSL)
  → Frontend (Nginx container) → Backend Go (proxy /api)
  → TenantMiddleware (hostname → tenant lookup → status active → match JWT claims)
  → schema tenant_<slug>
```

Persyaratan wajib operator & tim DevOps:

1. **Wildcard DNS**: Record A `*.domainanda.com` mengarah ke IP publik server host.
2. **Wildcard TLS/SSL**: Sertifikat SSL wildcard (Let's Encrypt via DNS-01 Challenge, Cloudflare SSL, atau SSL custom).
3. **Penyelarasan Domain Induk**: `TENANT_BASE_DOMAIN` (backend) dan build arg `VITE_TENANT_BASE_DOMAIN` (frontend) **harus identik**.
4. **Proxy IP Whitelist**: Isi `TRUSTED_PROXY_IPS` dengan IP/subnet Traefik/Nginx agar rate-limit per-IP bekerja akurat dan tidak memblokir proxy.
5. **Akses Subdomain Tenant**:
   - Tenant aktif: langsung dapat diakses via `<slug>.domainanda.com`.
   - Tenant nonaktif (`inactive`): ditolak dengan respons 403/404 oleh `TenantMiddleware`.
   - Tenant dihapus (**soft-delete**): status menjadi `inactive` dan `deleted_at` terisi; data dan skema database PostgreSQL tetap aman dan dapat dipulihkan.

---

## 4. Pipeline CI/CD Multi-Environment (GitHub Actions)

Alur otomatisasi deployment diatur melalui `.github/workflows/deploy.yml`:

1. **Lint, Test & Build Check** (berjalan pada setiap push & PR):
   - Backend Go: `go vet ./...` dan `go test -v ./...`.
   - Frontend React: `npm ci` dan `npm run build` (`tsc && vite build`).
2. **Deploy Staging** (trigger: push ke branch `refactor/enhancement`):
   - Deploy otomatis via SSH ke server staging (`iscube.web.id`).
   - GitHub Secrets yang dibutuhkan: `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY`, `STAGING_SSH_PORT`.
3. **Deploy Production** (trigger: push ke branch `main`):
   - Deploy otomatis via SSH ke server production.
   - GitHub Secrets yang dibutuhkan: `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, `PROD_SSH_PORT`.

## 5. Docker Images

| Dockerfile | Isi |
|---|---|
| `infrastructure/Dockerfile.backend` | Multi-stage Go (compose dev) |
| `infrastructure/Dockerfile.backend.dev` | Live-reload / dev Go |
| `Dockerfile.backend` (root) | Untuk `docker-compose.prod.yml` |
| `infrastructure/Dockerfile.frontend` | Vite → Nginx (compose dev); arg `VITE_TENANT_BASE_DOMAIN` |
| `Dockerfile.frontend` (root) | Untuk `docker-compose.prod.yml` |

## 6. Prosedur PWA & Service Worker Produksi

- Di lingkungan development lokal (`Vite dev`), Service Worker otomatis dimatikan agar tidak terjadi konflik MIME type HTML fallback.
- Di lingkungan produksi (saat dibuild via Docker atau `npm run build`), Service Worker (`dist/sw.js`) otomatis diinjeksi oleh `vite-plugin-pwa` dengan strategi `injectManifest`.
- Cache halaman HTML navigasi memakai strategi `NetworkOnly` untuk menjamin warga dan admin selalu mendapatkan rilis kode terbaru saat browser di-refresh.

Kompose suntik ke backend:

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `MINIO_PUBLIC_URL`, `MINIO_BUCKET`, `PORT` (internal `8080`), `TENANT_BASE_DOMAIN` (default `openrt.local`), `TRUSTED_PROXY_IPS`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `NIK_ENCRYPTION_KEY`, `JWT_SECRET`, dan di prod juga `RATE_LIMIT_*`/`AUTH_RATE_LIMIT_*`.

Backend baca `PORT`, `DB_*`, `DATABASE_URL`/`DB_URL`, `DB_SSLMODE`, `JWT_SECRET`, `NIK_ENCRYPTION_KEY`, `VAPID_*`, `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`, `TRUSTED_PROXY_IPS`, `TENANT_BASE_DOMAIN` (lihat `backend/pkg/config/config.go`).
