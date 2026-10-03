---
title: "Bundle Splitting & Optimasi Performa Mobile PWA"
description: "Konfigurasi Vite manualChunks, subset Latin font, prefetching mobile touch, dan strategi service worker"
tags:
  - frontend
  - performance
  - pwa
  - vite
---

# ⚡ Bundle Splitting & Optimasi Performa Mobile PWA

SiTransparan RT/RW dioptimalkan untuk kecepatan pemuatan instan pada smartphone warga dengan koneksi seluler 3G/4G.

---

## 1. Strategi Pembagian Berkas (Chunking)

Dikonfigurasi di `frontend/vite.config.ts`:
- **Ukuran Entry Chunk**: Berhasil dipangkas sebesar **70%** (dari 448 kB menjadi 134 kB mentah, ~43 kB gzip).
- **Vendor Splitting**:
  - `vendor-react`: React, React-DOM, React-Router-DOM
  - `vendor-query`: TanStack Query v5
  - `vendor-icons`: Lucide-React
  - `vendor-charts`: Recharts (lazy loaded)
- **Visualizer Bundle**: Menggunakan `rollup-plugin-visualizer` menghasilkan `dist/stats.html` untuk memantau dependensi.

---

## 2. Optimasi Font & Aset PWA

- **Font Latin-Only Subsetting**: Menghapus glyph Cyrillic, Greek, dan simbol non-Latin dari Google Fonts di `index.css`. Ukuran CSS berkurang 47% (24 kB ke 12 kB gzip).
- **Aset Precache PWA**: Berkurang dari 96 file menjadi 71 file, mempercepat instalasi awal PWA.
- **HTML Network-Only**: Halaman HTML utama tidak di-cache oleh Service Worker secara permanen untuk mencegah halaman usang (stale app) saat deployment rilis baru.

---

## 3. Fluida Mobile (Instant Navigation)

- **`onTouchStart` Prefetch**: Navigasi bawah mobile (`MainLayout`, `PublicLayout`) mulai mem-prefetch data TanStack Query begitu jari warga menyentuh layar, memotong latensi hingga 100ms sebelum tap selesai.
- **Top Loading Progress Bar**: Menggantikan spinner di tengah layar yang mengganggu flow visual.
- **GPU Transition**: Animasi halus 130ms fade-in (`page-fluid-enter`) saat berpindah tab.

---

## 4. Hubungan Lintas Dokumen

- [[07-frontend-design/apple-design-system|Design System]]
- [[02-modules/notifikasi-webpush|Web Push Service Worker]]
- [[00-MOC|Kembali ke MOC]]
