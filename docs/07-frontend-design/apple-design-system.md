---
title: "Apple-Style Design Tokens & UI Architecture"
description: "Standar estetika antarmuka: palet warna, tipografi, blur translusen, dan haptic feedback"
tags:
  - frontend
  - design
  - ui-ux
  - styling
---

# 🍏 Apple-Style Design Tokens & UI Architecture

Antarmuka pengguna SiTransparan RT/RW dirancang dengan prinsip desain Apple Human Interface Guidelines: bersih, tenang, berfokus pada data, dan memberikan sensasi taktil yang memuaskan.

---

## 1. Prinsip Desain Visual

1. **Tipografi Hirarkis**: Menggunakan font Inter dengan subset Latin yang dioptimalkan, kontras teks bergradasi (`text-slate-900`, `text-slate-500`, `text-slate-400`).
2. **Efek Translusion & Frosted Glass**: Menggunakan kombinasi `backdrop-blur-md` dan background semitransparan (`bg-white/80` atau `bg-slate-900/80`) untuk header, navigasi bawah mobile, dan modal dialog.
3. **Sentuhan Halus (Micro-interactions)**: Transisi masuk halaman GPU-accelerated (`page-fluid-enter`, 130ms durasi) dan feedback aktif pada tombol (`active:scale-[0.98]`).
4. **Palet Warna Netral & Elegan**:
   - Background canvas: `bg-slate-50` (terang) / `bg-slate-950` (gelap).
   - Aksen Utama: `emerald-600` (melambangkan transparansi keuangan dan lingkungan).
   - Indikator Status: `emerald` (sukses/terverifikasi), `amber` (menunggu/pending), `rose` (ditolak/kritis).

---

## 2. Hubungan Lintas Dokumen

- [[07-frontend-design/anti-ai-slop-rules|Aturan Anti-AI-Slop]]
- [[07-frontend-design/bundle-and-performance|Optimasi Performa & Bundle]]
- [[00-MOC|Kembali ke MOC]]
