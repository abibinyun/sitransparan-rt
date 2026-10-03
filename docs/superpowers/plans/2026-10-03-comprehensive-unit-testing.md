# Implementation Plan: Comprehensive Unit Testing Suite (Frontend & Backend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a complete, deterministic unit testing suite across Frontend (Vitest + React Testing Library) and Backend (Go unit tests for all remaining usecases).

**Architecture:**
- Frontend: Install `vitest`, `@testing-library/react`, `jsdom`. Add `test` script in `package.json`.
- Frontend tests: `useAuthStore`, `api.ts` (401 refresh queue), utilities (`date`, `tenant`, `imageCompressor`).
- Backend tests: `auth_usecase_test.go` (refresh tokens & reuse detection), `waste_bank_usecase_test.go`, `meeting_usecase_test.go`, `waste_attendance_usecase_test.go`, `rt_structure_usecase_test.go`.
- Documentation: Update `docs/06-testing-qa/` and `docs/00-MOC.md`.

**Tech Stack:** Vitest, React Testing Library, jsdom, Go `testing` package.

**Spec:** `docs/superpowers/specs/2026-10-03-comprehensive-unit-testing.md`

---

### Task 1: Setup Vitest in Frontend
**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Install Vitest and testing dependencies in frontend**
  - Run: `cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] **Step 2: Configure Vitest in `vite.config.ts` and add `npm test` script**
- [ ] **Step 3: Create `src/test/setup.ts` with browser API mocks (matchMedia, localStorage)**

---

### Task 2: Frontend Unit Tests (Auth Store, API Queue, Utils)
**Files:**
- Create: `frontend/src/store/__tests__/useAuthStore.test.ts`
- Create: `frontend/src/services/__tests__/api.test.ts`
- Create: `frontend/src/utils/__tests__/date.test.ts`
- Create: `frontend/src/utils/__tests__/tenant.test.ts`

- [ ] **Step 1: Write `useAuthStore.test.ts`**
  - Test setting token, refresh token, role, isolation prefix, and logout cleanup.
- [ ] **Step 2: Write `api.test.ts`**
  - Test Authorization header injection and 401 response silent refresh queue.
- [ ] **Step 3: Write `date.test.ts` and `tenant.test.ts`**
  - Test WIB date formatting and subdomain slug extraction.
- [ ] **Step 4: Run Vitest to verify all pass**
  - Run: `cd frontend && npm test -- --run`

---

### Task 3: Backend Unit Tests (Auth Refresh Token & Revocation)
**Files:**
- Modify: `backend/internal/usecase/auth_usecase_test.go`

- [ ] **Step 1: Add mockRefreshTokenRepo to `auth_usecase_test.go`**
- [ ] **Step 2: Write `TestAuthUsecase_LoginWithRefresh`**
- [ ] **Step 3: Write `TestAuthUsecase_RefreshToken_Success` and `TestAuthUsecase_RefreshToken_ReuseDetection`**
- [ ] **Step 4: Write `TestAuthUsecase_RevokeUserSessions`**
- [ ] **Step 5: Run Go tests**
  - Run: `cd backend && go test -v ./internal/usecase -run TestAuthUsecase_Refresh`

---

### Task 4: Backend Unit Tests (Waste Bank, Meeting, and RT Structure)
**Files:**
- Create: `backend/internal/usecase/waste_bank_usecase_test.go`
- Create: `backend/internal/usecase/meeting_usecase_test.go`
- Create: `backend/internal/usecase/waste_attendance_usecase_test.go`
- Create: `backend/internal/usecase/rt_structure_usecase_test.go`

- [ ] **Step 1: Write `waste_bank_usecase_test.go` (share calculation & deposit)**
- [ ] **Step 2: Write `meeting_usecase_test.go` (confidential visibility enforcement)**
- [ ] **Step 3: Write `waste_attendance_usecase_test.go` (attendance honor total calculation)**
- [ ] **Step 4: Write `rt_structure_usecase_test.go` (period active status transition)**
- [ ] **Step 5: Run full backend test suite**
  - Run: `cd backend && go test -v ./...`

---

### Task 5: Documentation Sync & Pre-Commit Validation
**Files:**
- Modify: `docs/06-testing-qa/backend-test-suite.md`
- Create: `docs/06-testing-qa/frontend-unit-test-suite.md`
- Modify: `docs/00-MOC.md`
- Modify: `README.md`
- Run: `./scripts/validate-docs.py`

- [ ] **Step 1: Document Vitest frontend suite in `docs/06-testing-qa/`**
- [ ] **Step 2: Update `backend-test-suite.md` with new usecase coverage**
- [ ] **Step 3: Update `docs/00-MOC.md` and `README.md`**
- [ ] **Step 4: Run pre-commit validation to ensure 0 broken links**
