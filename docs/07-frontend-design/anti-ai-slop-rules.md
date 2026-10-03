---
title: "Aturan Anti-AI-Slop & Standardisasi Komponen"
description: "Panduan ketat pencegahan regresi UI/UX: larangan native select, larangan tombol dekoratif, dan dekomposisi modular"
tags:
  - frontend
  - rules
  - quality
  - anti-slop
---

# 🛑 Aturan Anti-AI-Slop & Standardisasi Komponen

Untuk menjaga integritas kualitas kode dan konsistensi antarmuka pengguna, seluruh agen dan pengembang wajib mematuhi aturan baku berikut:

---

## 1. Tiga Aturan Mutlak UI/UX (Strict Component Library Adoption)

### A. Larangan Tag HTML Primitif Mentah (Wajib Pakai Komponen UI Library)
- **Larangan Native `<select>`**:
  - **Dilarang keras** menggunakan tag bawaan `<select>` dan `<option>`. Tag native merusak styling kustom, inkonsisten antar peramban seluler (iOS Safari vs Android Chrome), dan menciptakan tampilan murahan (slop).
  - **Wajib menggunakan** komponen pustaka UI kustom:
    - `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` dari `@/components/ui/select`.
    - Atau `SearchableResidentSelect` untuk dropdown berfitur pencarian dinamis data warga.
- **Larangan Tag Primitif Form Lain Tanpa Komponen**:
  - Tombol aksi wajib menggunakan `<Button>` dari `@/components/ui/button`.
  - Input teks / tanggal wajib menggunakan `<Input>` dari `@/components/ui/input`.
  - Input teks panjang wajib menggunakan `<Textarea>` dari `@/components/ui/textarea`.
  - Dialog pop-up / modal wajib menggunakan `<Dialog>` dari `@/components/ui/dialog`.
  - Tabel data tabular wajib menggunakan `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>` dari `@/components/ui/table`.
  - Label form wajib menggunakan `<Label>` dari `@/components/ui/label`.
  - Status pill / badge wajib menggunakan `<Badge>` dari `@/components/ui/badge`.
- **Kebijakan Komponen Baru (Radix UI / Shadcn First)**:
  - Jika butuh komponen baru yang belum ada di `frontend/src/components/ui/` (seperti `Popover`, `Accordion`, `Switch`, `Tooltip`, `Slider`):
    - **Wajib pasang paket resmi Radix UI** (`@radix-ui/react-*`) dan buat wrapper-nya di `@/components/ui/<nama>.tsx` mengikuti pola Shadcn.
    - Dilarang langsung membuat fallback native HTML mentah sebelum memeriksa ekosistem Radix UI.

### B. Larangan Tombol Dekoratif / Tanpa Fungsi Nyata
- Setiap tombol di header atau tabel **wajib memiliki fungsi yang terhubung ke backend**.
- *Contoh yang telah diperbaiki*: Tombol "Kantong Kas Baru" di header halaman keuangan dihapus karena fungsi pembuatan kantong kas sudah tersedia secara kontekstual di dalam tab Master Kas.
- Tombol reset dev/staging disembunyikan di lingkungan produksi (`import.meta.env.PROD`).

### C. Dekomposisi Halaman Modular (Maksimal ~700 Baris)
- Halaman tidak boleh berupa satu file monolitis berukuran ribuan baris.
- Pecah setiap tab, tabel, dan form modal ke file terpisah di bawah direktori `src/components/<module>/`.
- Menggunakan TanStack Query hooks untuk isolasi fetching data per komponen.

---

## 2. Hubungan Lintas Dokumen

- [[07-frontend-design/apple-design-system|Design System]]
- [[07-frontend-design/bundle-and-performance|Bundle Splitting]]
- [[00-MOC|Kembali ke MOC]]
