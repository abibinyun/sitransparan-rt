# Modul Dokumentasi Internal Admin RT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul dokumentasi in-app internal bergaya Laravel Docs di rute `/admin/panduan` khusus untuk Admin RT dan Superadmin, berisi panduan operasional terstruktur dengan fitur live search instan, callout alerts, alur bertahap (step-by-step), dan deep action links ke fitur aplikasi.

**Architecture:** Data panduan disimpan dalam file TypeScript statis terstruktur (`src/data/adminDocsData.ts`), dirender dengan antarmuka 2-kolom responsif di `src/pages/AdminDocsPage.tsx`, diproteksi oleh role guard di `MainLayout.tsx`, dan didaftarkan sebagai rute lazy-loaded di `App.tsx`.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Lucide React, React Router v6, Vitest/Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-09-27-admin-docs-design.md`

## Global Constraints

- Semua perubahan kode harus dimulai dari branch `dev` sesuai aturan AGENTS.md §46.11.
- Zero dependency npm baru: gunakan icon yang sudah ada di `lucide-react` dan styling native Tailwind.
- Zero-latency & offline compatible: konten disimpan di frontend, tidak bergantung pada koneksi backend/API baru.
- RBAC Guard: Menu dan halaman hanya boleh diakses oleh role `admin_rt` dan `superadmin`. Role `resident` atau anonim diarahkan ke dashboard atau halaman 403/login.

## Review Focus

- **Empty search query**: Ketika kotak pencarian kosong atau dihapus, daftar kategori dan artikel harus kembali ke kondisi awal lengkap tanpa error.
- **Direct deep-link URL**: Membuka langsung `/admin/panduan/:slug` dengan slug yang valid harus langsung memilih artikel bersangkutan; jika slug tidak valid, harus fallback secara mulus ke artikel pertama.
- **Mobile drawer / responsive toggle**: Di layar HP (< 640px), sidebar daftar isi harus dapat dibuka/tutup dengan tombol drawer tanpa overflow horizontal pada dokumen.
- **Role boundary violation**: Jika user ber-role `resident` memaksa navigasi ke `/admin/panduan`, UI tidak boleh menampilkan dokumen internal pengurus.
- **Action links**: Setiap tautan pintasan aksi (misal `/admin/financial`, `/admin/residents`) harus mengarahkan ke rute aplikasi internal yang valid tanpa memicu reload halaman penuh.

---

### Task 1: Buat Model Data dan Konten Dokumentasi Admin RT

**Files:**
- Create: `frontend/src/data/adminDocsData.ts`
- Test: `frontend/src/data/adminDocsData.test.ts`

**Interfaces:**
- Produces: 
  ```typescript
  export interface DocActionLink { label: string; to: string; }
  export interface DocStep { step: number; title: string; description: string; actionLink?: DocActionLink; }
  export interface DocCallout { type: 'info' | 'warning' | 'tip'; title: string; message: string; }
  export interface DocSection { heading: string; content: string[]; steps?: DocStep[]; callout?: DocCallout; }
  export interface DocArticle { slug: string; title: string; category: string; badge?: string; readTime: string; excerpt: string; sections: DocSection[]; }
  export interface DocCategory { id: string; name: string; description: string; iconName: string; articles: DocArticle[]; }
  export const adminDocCategories: DocCategory[];
  export function getAllArticles(): DocArticle[];
  export function getArticleBySlug(slug: string): DocArticle | undefined;
  ```

- [ ] **Step 1: Tulis unit test untuk data integrity dan helper functions**

```typescript
// frontend/src/data/adminDocsData.test.ts
import { describe, it, expect } from 'vitest';
import { adminDocCategories, getAllArticles, getArticleBySlug } from './adminDocsData';

describe('Admin Docs Data Structure', () => {
  it('contains at least 6 core categories', () => {
    expect(adminDocCategories.length).toBeGreaterThanOrEqual(6);
  });

  it('each category has valid articles with unique slugs', () => {
    const articles = getAllArticles();
    expect(articles.length).toBeGreaterThanOrEqual(6);
    const slugs = articles.map(a => a.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it('getArticleBySlug retrieves exact article and returns undefined for invalid slug', () => {
    const firstSlug = adminDocCategories[0].articles[0].slug;
    const found = getArticleBySlug(firstSlug);
    expect(found).toBeDefined();
    expect(found?.slug).toBe(firstSlug);

    const notFound = getArticleBySlug('non-existent-slug-xyz');
    expect(notFound).toBeUndefined();
  });
});
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (file belum ada)**

Run: `cd frontend && npx vitest run src/data/adminDocsData.test.ts`
Expected: FAIL (Cannot find module `./adminDocsData`)

- [ ] **Step 3: Buat implementasi `frontend/src/data/adminDocsData.ts`**

Buat data komprehensif untuk 6 kategori dokumen (Onboarding, Kependudukan QR, Keuangan Multi-Fund, Kegiatan & Rapat, Bank Sampah Pemuda, Komunikasi & Publikasi) lengkap dengan alur langkah, callout box, dan helper functions `getAllArticles()` serta `getArticleBySlug(slug)`.

- [ ] **Step 4: Jalankan test untuk memverifikasi kelulusan**

Run: `cd frontend && npx vitest run src/data/adminDocsData.test.ts`
Expected: PASS 3 tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/data/adminDocsData.ts frontend/src/data/adminDocsData.test.ts
git commit -m "feat(docs): create structured admin docs dataset and query helpers"
```

---

### Task 2: Buat Halaman Komponen `AdminDocsPage.tsx` (Laravel Docs Style)

**Files:**
- Create: `frontend/src/pages/AdminDocsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/data/adminDocsData.test.ts`

**Interfaces:**
- Consumes: `adminDocCategories`, `getAllArticles`, `getArticleBySlug` from `../data/adminDocsData`
- Produces: `export const AdminDocsPage: React.FC`

- [ ] **Step 1: Buat komponen `AdminDocsPage.tsx`**

Implementasikan layout 2 kolom:
- Header atas dengan judul modul dan search bar live (memfilter kategori/artikel secara instan).
- Sidebar navigasi kiri sticky dengan kategori accordion dan indikator artikel aktif.
- Drawer / mobile collapsible untuk akses daftar isi di layar smartphone.
- Reading pane kanan yang merender:
  - Header: Breadcrumb, Judul Artikel, Badge, Estimasi Waktu Baca.
  - Ringkasan teks (*excerpt*).
  - Seksi konten: paragraf panduan, callout alerts bergaya Apple/Tailwind (`bg-blue-50`, `bg-amber-50`, `bg-emerald-50`), daftar langkah bertahap (numbered steps) dengan tombol *Action Link* (NavLink ke rute terkait).
  - Footer navigasi artikel: Tombol "← Artikel Sebelumnya" dan "Artikel Selanjutnya →".

- [ ] **Step 2: Daftarkan rute di `frontend/src/App.tsx`**

Tambahkan:
```typescript
const AdminDocsPage = lazy(() =>
  import('./pages/AdminDocsPage').then((m) => ({ default: m.AdminDocsPage }))
);
```
Dan dalam rute admin di dalam `<Route element={<MainLayout />}>`:
```typescript
<Route path="/admin/panduan" element={<AdminDocsPage />} />
<Route path="/admin/panduan/:slug" element={<AdminDocsPage />} />
```

- [ ] **Step 3: Verifikasi build dan typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: Exited with code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminDocsPage.tsx frontend/src/App.tsx
git commit -m "feat(docs): implement AdminDocsPage component and route registration"
```

---

### Task 3: Integrasikan Navigasi Sidebar di `MainLayout.tsx`

**Files:**
- Modify: `frontend/src/components/MainLayout.tsx`

**Interfaces:**
- Consumes: Icon `BookOpen` from `lucide-react`
- Modifies: `baseNavItems` in `MainLayout.tsx`

- [ ] **Step 1: Tambahkan item menu di `baseNavItems`**

Di `frontend/src/components/MainLayout.tsx`:
Tambahkan icon `BookOpen` di import `lucide-react`.
Tambahkan pada array `baseNavItems`:
```typescript
{
  to: '/admin/panduan',
  label: 'Buku Panduan RT',
  icon: BookOpen,
  adminOnly: true,
  matchPrefixes: ['/admin/panduan']
},
```

- [ ] **Step 2: Verifikasi role filtering di `MainLayout.tsx`**

Pastikan menu hanya dirender untuk role `admin_rt` dan `superadmin`, serta disembunyikan untuk role `resident`.

- [ ] **Step 3: Jalankan typecheck frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/MainLayout.tsx
git commit -m "feat(docs): wire BookOpen navigation link in admin sidebar"
```

---

### Task 4: Buat E2E Playwright Suite untuk Verifikasi Modul Panduan

**Files:**
- Create: `tests/e2e/admin/docs.spec.ts`

**Interfaces:**
- Consumes: `login`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `../helpers`

- [ ] **Step 1: Tulis skenario pengujian E2E Playwright**

```typescript
// tests/e2e/admin/docs.spec.ts
import { test, expect } from '@playwright/test';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

test.describe('Admin Documentation Module (Buku Panduan RT)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Admin RT can access documentation via sidebar and URL', async ({ page }) => {
    // 1. Klik menu Buku Panduan RT di sidebar
    const navLink = page.getByRole('link', { name: /Buku Panduan RT/i }).first();
    await expect(navLink).toBeVisible();
    await navLink.click();

    // 2. Verifikasi masuk ke rute /admin/panduan
    await expect(page).toHaveURL(/.*\/admin\/panduan/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. Verifikasi sidebar kategori muncul
    await expect(page.getByText('Daftar Panduan')).toBeVisible();
  });

  test('Instant live search filters articles correctly', async ({ page }) => {
    await page.goto('/admin/panduan');
    const searchInput = page.getByPlaceholder(/Cari panduan/i);
    await expect(searchInput).toBeVisible();

    // Ketik pencarian "QR"
    await searchInput.fill('QR');
    await expect(page.getByText(/Stiker QR Rumah/i)).toBeVisible();

    // Bersihkan pencarian
    await searchInput.fill('');
    await expect(page.getByText(/Memulai & Onboarding/i)).toBeVisible();
  });

  test('Mobile viewport renders responsive drawer and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/panduan');

    // Cek header dan reading pane
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verifikasi tidak ada horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBeFalsy();
  });
});
```

- [ ] **Step 2: Jalankan Playwright E2E suite**

Run: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3002 npx playwright test tests/e2e/admin/docs.spec.ts --config=playwright.headless.config.ts`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin/docs.spec.ts
git commit -m "test(e2e): add automated regression test suite for admin documentation module"
```
