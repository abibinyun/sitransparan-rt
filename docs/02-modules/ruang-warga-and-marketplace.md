---
title: "Modul Ruang Warga & Lapak UMKM"
tags:
  - module
  - community
  - marketplace
  - discussion
---

# 💬 Modul Ruang Warga & Lapak UMKM

Dokumentasi resmi untuk modul interaksi warga, forum diskusi, tanya tetangga, dan etalase lapak UMKM warga lingkungan RT/RW.

## 1. Pemetaan Arsitektur Kode Sumber

```text
backend/
├── internal/domain/community.go               # Entitas CommunityPost, CommunityComment, CommunityReaction
├── internal/repository/community_repository.go# Query schema-qualified tenant_<slug>.community_*
├── internal/usecase/community_usecase.go      # Logika moderasi, komentar bertingkat, reaksi, & auto-notifikasi
└── internal/delivery/http/community_handler.go# Endpoint REST /api/v1/community/...
frontend/
├── src/services/community.ts                  # TanStack Query hooks & Axios requests
├── src/utils/whatsapp.ts                      # Generator URL WhatsApp template pemesanan lapak
├── src/components/community/PostCard.tsx      # Komponen card postingan & interaksi reaksi
├── src/components/community/MarketplaceCard.tsx# Komponen card katalog dagangan & tombol pesan WA
├── src/components/community/CommentThreadModal.tsx # Dialog thread komentar bertingkat (parent-child)
├── src/components/community/CreatePostModal.tsx   # Dialog pembuatan kiriman diskusi, tanya warga, & jualan
└── src/pages/CommunityPage.tsx                # Halaman utama Ruang Warga (/community)
```

## 2. Fitur & Logika Bisnis Utama

### A. Tipe Kiriman Komunitas (`post_type`)
Postingan warga dibagi menjadi 3 kategori:
1. `discussion`: Obrolan santai, kabar lingkungan, atau ide gotong royong.
2. `marketplace`: Promosi jualan makanan, produk rumahan, atau jasa warga.
3. `question`: Tanya rekomendasi jasa/tukang, informasi jadwal, atau kendala lingkungan. Dapat ditandai `is_solved = true` oleh pembuat postingan atau pengurus RT.

### B. Siklus Hidup Penuh Kiriman (CRUD & Otorisasi)
- **Edit Kiriman (`PUT /community/posts/{id}`)**: Pemilik postingan dapat mengedit judul, isi, harga, kontak WhatsApp, kategori, foto lampiran, dan mode anonim tanpa mengubah konteks tipe kiriman.
- **Hapus Kiriman (`DELETE /community/posts/{id}`)**: Dilindungi aturan otorisasi. Hanya dapat dihapus oleh pemilik postingan atau pengurus RT (`admin_rt`, `superadmin`, `operator`) melalui mekanisme soft-delete (`deleted_at = NOW()`).
- **Hapus Komentar (`DELETE /community/posts/{id}/comments/{commentId}`)**: Komentar yang melanggar ketertiban dapat dihapus oleh pembuat komentar, pemilik postingan (hak moderasi pemilik utas), atau pengurus RT.

### C. Opsi Anonim Terlindungi (`is_anonymous`)
Untuk diskusi atau pertanyaan yang sensitif, warga dapat mencentang opsi anonim. Di antarmuka publik dan respons API publik, `author_name` disamarkan menjadi "Warga Lingkungan" dan nomor rumah disembunyikan.

### D. Tombol Pesan WhatsApp Cepat (Lapak UMKM)
Lapak dagangan terintegrasi dengan utilitas [[02-modules/ruang-warga-and-marketplace|whatsapp.ts]] yang menghasilkan tautan direct WhatsApp (`https://wa.me/<phone>?text=...`) dengan pre-filled template pesanan otomatis mencantumkan nama item dan harga.

### E. Komentar Bertingkat & Notifikasi Reaksi
Komentar mendukung balasan satu tingkat (`parent_comment_id`). Ketika ada warga yang mengomentari kiriman, sistem usecase secara otomatis menerbitkan record in-app notification ke penulis kiriman asalkan bukan dirinya sendiri. Reaksi emoji (`pray`, `applause`, `like`) disimpan per user secara toggle (klik lagi untuk batal).

## 3. Hubungan Lintas Dokumen
- [[00-MOC|Peta Dokumen Utama (MOC)]]
- [[03-database/schema-inventory|Skema Basis Data]] (Tabel `community_posts`, `community_comments`, `community_reactions`)
- [[02-modules/pusat-notifikasi-inbox|Modul Pusat Notifikasi Inbox]] (Notifikasi komentar & mention)
- [[02-modules/pusat-keamanan-warga|Modul Pusat Keamanan Warga]]
- [[03-api/api-inventory|Katalog Endpoint API]]
