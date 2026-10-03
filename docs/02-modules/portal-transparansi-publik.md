---
title: "Modul Portal Transparansi Publik"
description: "Etalase transparansi terbuka bagi warga dan umum tanpa kewajiban login"
tags:
  - module
  - public-portal
  - transparency
  - citizen
---

# 🌍 Modul Portal Transparansi Publik

Portal Transparansi Publik adalah beranda digital terbuka yang dapat diakses siapa saja untuk melihat keterbukaan tata kelola RT (anggaran, kegiatan, pengumuman, bank sampah, aspirasi).

---

## 1. Rute Publik & URL Mapping

| Rute URL Frontend | Endpoint Backend API | Fungsi |
|---|---|---|
| `/` (pada tenant subdomain) | `GET /api/v1/t/{slug}/info` | Ringkasan profil RT, kontak darurat, dan highlight |
| `/kabar` | `GET /api/v1/t/{slug}/announcements` | Feed berita & pengumuman publik (infinite scroll) |
| `/usulan` | `GET /api/v1/t/{slug}/aspirations` | Papan aspirasi dan forum ide warga |
| `/agenda` | `GET /api/v1/t/{slug}/events` | Kalender agenda dan musyawarah warga |
| `/karang-taruna` | `GET /api/v1/t/{slug}/karang-taruna` | Profil pemuda, pengurus, dan kegiatan |
| `/bank-sampah` | `GET /api/v1/t/{slug}/waste-bank/summary` | Metrik kilogram sampah terkelola & daftar harga |

---

## 2. Fitur & Penegakan Keamanan Data

### A. Sanitasi Data Publik
Endpoint publik (`/api/v1/t/{slug}/...`) secara ketat menyaring field-field sensitif:
- Nomor HP disamarkan sebagian jika bukan kontak resmi humas.
- NIK warga tidak pernah disertakan dalam payload publik.
- Pengumuman bertanda `residents_only` otomatis disaring dari feed publik.

### B. Indikator Kinerja & Analitik Keterlibatan
Portal merekam metrik anonim untuk memantau efektivitas transparansi:
- Event KPI: `feed_view`, `share_opened`, `report_downloaded` yang dicatat di tabel `public.portal_events`.

---

## 3. Hubungan Lintas Dokumen

- [[01-architecture/subdomain-and-routing|Resolusi Subdomain Tenant]]
- [[02-modules/kabar-and-documents|Pengumuman di Portal Publik]]
- [[02-modules/keuangan-and-dues|Transparansi Ringkasan Kas]]
- [[00-MOC|Kembali ke MOC]]
