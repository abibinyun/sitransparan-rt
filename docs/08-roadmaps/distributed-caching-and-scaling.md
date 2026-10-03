---
title: "Roadmap: Distributed Caching & Rate Limiting (Redis / Valkey)"
description: "Rencana transisi dari in-memory ke distributed caching dan horizontal scaling saat trafik RT/RW melonjak"
tags:
  - roadmap
  - scaling
  - redis
  - valkey
---

# 🚀 Roadmap: Distributed Caching & Rate Limiting (Redis / Valkey)

Dokumen ini mencatat rancangan transisi ketika aplikasi memasuki skala ratusan tenant aktif yang membutuhkan horizontal scaling multi-instance backend Go.

---

## 1. Kapan Membutuhkan Redis / Valkey?

1. **Replikasi Backend Multi-Container**: Ketika service `backend` di-deploy dengan `replicas: 3` atau lebih di Kubernetes / Docker Swarm.
2. **Global Sliding Window Rate Limit**: Menghitung kuota burst IP secara serentak lintas container.
3. **Penyimpanan Cache Data Publik**: Caching respons `GET /t/{slug}/info`, `GET /t/{slug}/announcements` untuk mengurangi beban CPU database PostgreSQL.

---

## 2. Rencana Implementasi Teknis

- Menggunakan **Valkey** (fork open-source berlisensi BSD dari Redis).
- Pustaka Go: `github.com/redis/go-redis/v9`.
- Pola *Fail-Open*: Jika Redis mengalami gangguan jaringan atau down, middleware otomatis fallback mengizinkan request dengan log warning agar operasional warga tidak terganggu.

---

## 3. Hubungan Lintas Dokumen

- [[05-operations-devops/docker-and-traefik|Konfigurasi Traefik Saat Ini]]
- [[01-architecture/authentication-and-rbac|Autentikasi & Sesi]]
- [[00-MOC|Kembali ke MOC]]
