---
title: "Docker & Traefik v3.6 Routing"
description: "Arsitektur orkestrasi container dev dan produksi dengan Traefik v3.6 reverse proxy"
tags:
  - operations
  - devops
  - docker
  - traefik
---

# 🐳 Docker & Traefik v3.6 Routing

Infrastruktur SiTransparan RT/RW berjalan dalam ekosistem Docker Compose yang diproteksi dan diarahkan oleh **Traefik v3.6+**.

---

## 1. Topologi Container

```mermaid
graph TD
    Internet[Trafik Masuk: Port 80 / 443] --> Traefik[Traefik v3.6 Reverse Proxy]
    Traefik -->|Path /api| Backend[Backend Go Container: Port 8080]
    Traefik -->|Static & SPA Routes| Frontend[Frontend Nginx Container: Port 80]
    Backend --> DB[(PostgreSQL 16: Port 5432)]
    Backend --> MinIO[(MinIO S3 Storage: Port 9000)]
```

---

## 2. File Docker Compose

Tersedia file konfigurasi per lingkungan di direktori `infrastructure/`:
- `docker-compose.yml`: Lingkungan pengujian dev lokal (`openrt.local`).
- `docker-compose.staging.yml`: Lingkungan integrasi staging (`*-staging.iscube.web.id`).
- `docker-compose.prod.yml`: Lingkungan operasional live produksi (`*.iscube.web.id`).

---

## 3. Aturan Krusial Traefik v3.6 & Native Rate Limiter
- Traefik versi 3.6+ wajib digunakan karena image Traefik versi lama mematok Docker client API v1.24 yang ditolak oleh Docker Engine modern (`client version 1.24 is too old`).
- Gunakan aturan routing berbasis `HostRegexp`:
  ```yaml
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.frontend.rule=HostRegexp(`^[a-z0-9-]+\\.${TENANT_BASE_DOMAIN}$`)"
  ```
- **Native Edge Rate Limiter (Defense-in-Depth)**:
  - Traefik v3 menyaring banjir traffic di tepi jaringan sebelum request menyentuh container backend Go:
  ```yaml
  labels:
    - "traefik.http.routers.backend_dev.middlewares=backend_dev_ratelimit"
    - "traefik.http.middlewares.backend_dev_ratelimit.ratelimit.average=100"
    - "traefik.http.middlewares.backend_dev_ratelimit.ratelimit.burst=50"
    - "traefik.http.middlewares.backend_dev_ratelimit.ratelimit.period=1s"
  ```

---

## 4. Hubungan Lintas Dokumen

- [[01-architecture/subdomain-and-routing|Arsitektur Subdomain]]
- [[05-operations-devops/sdlc-and-promotion-workflow|Alur Promosi Lingkungan]]
- [[00-MOC|Kembali ke MOC]]
