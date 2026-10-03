# Spesifikasi Desain: Comprehensive Unit Testing Suite (Frontend & Backend)

> **Status:** Draft / Ready for Implementation Plan
> **Target Branch:** `dev`
> **Terkait Dokumen:** [[06-testing-qa/backend-test-suite]], [[06-testing-qa/e2e-playwright-suite]]

---

## 1. Sasaran & Filosofi Pengujian Unit

Prinsip: **Semua logika bisnis, manipulasi state, kalkulasi finansial, proteksi data, dan utilitas yang berdiri sendiri WAJIB memiliki unit test terisolasi.**

- **Backend (Go)**:
  - Menguji logika usecase yang belum memiliki test file (`waste_bank_usecase`, `waste_attendance_usecase`, `meeting_usecase`, `rt_structure_usecase`, `push_usecase`, `audit_log_usecase`, `health_usecase`).
  - Menguji Refresh Token rotation & reuse detection logic secara menyeluruh di usecase & repository mock.
- **Frontend (React / TypeScript)**:
  - Memasang **Vitest** + **@testing-library/react** + **jsdom** (native Vite, zero config bloat).
  - Menguji seluruh helper utilities (`date.ts`, `tenant.ts`, `imageCompressor.ts`, `routePrefetch.ts`).
  - Menguji `useAuthStore` (token, refresh token, role, isolation prefix).
  - Menguji `api.ts` (Axios 401 retry queue interceptor).
  - Menguji rumus matematis: bagi hasil bank sampah warga-pemuda, saldo kantong kas, aggregasi RAPB event.

---

## 2. Arsitektur Pengujian Frontend (Vitest)

### A. Dependensi Frontend yang Dibutuhkan
- `vitest`: Test runner ultra-cepat terintegrasi dengan Vite.
- `@testing-library/react`: Testing primitives untuk React hooks & komponen.
- `jsdom`: Simulasi browser environment (localStorage, document.cookie, window.location).

### B. Konfigurasi `frontend/vite.config.ts`
Menambahkan blok `test`:
```ts
/// <reference types="vitest" />
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  // ... plugins & build config
});
```

---

## 3. Cakupan Inventaris Unit Test Baru

### A. Backend Unit Tests:
1. `backend/internal/usecase/auth_usecase_test.go`:
   - `TestAuthUsecase_LoginWithRefresh`
   - `TestAuthUsecase_RefreshToken_Success`
   - `TestAuthUsecase_RefreshToken_ReuseDetection`
   - `TestAuthUsecase_RevokeUserSessions`
2. `backend/internal/usecase/waste_bank_usecase_test.go`:
   - Uji kalkulasi bagi hasil otomatis (`resident_share_pct` vs kas pemuda).
3. `backend/internal/usecase/waste_attendance_usecase_test.go`:
   - Uji agregasi presensi piket dan perhitungan uang lelah / honor.
4. `backend/internal/usecase/meeting_usecase_test.go`:
   - Uji penegakan hak akses visibility `confidential` vs `public`.
5. `backend/internal/usecase/rt_structure_usecase_test.go`:
   - Uji aktivasi periode RT baru dan arsip otomatis periode lama.

### B. Frontend Unit Tests:
1. `frontend/src/store/__tests__/useAuthStore.test.ts`:
   - Inisialisasi token & refresh token dari localStorage / cookie.
   - Env prefix isolation (`dev_`, `staging_`).
   - Logout membersihkan token, refresh token, cookie, dan cache.
2. `frontend/src/services/__tests__/api.test.ts`:
   - Request interceptor menginjeksi Bearer token.
   - Response interceptor 401: antrean request, pemanggilan `/auth/refresh`, retry request.
   - Refresh token gagal memicu logout.
3. `frontend/src/utils/__tests__/date.test.ts`:
   - Formatter tanggal Indonesia (WIB) & relative time.
4. `frontend/src/utils/__tests__/tenant.test.ts`:
   - Resolusi subdomain, hostname matching, platform URL builder.

---

## 4. Skrip Eksekusi
- Backend: `make test-backend` atau `cd backend && go test -v ./...`
- Frontend: `npm test` atau `cd frontend && npm run test`
