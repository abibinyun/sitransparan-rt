# Implementation Plan: Refresh Token, Session Revocation, and Traefik Rate Limiting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement robust server-side token revocation and automatic refresh token rotation (PostgreSQL-backed) and edge rate-limiting in Traefik v3.

**Architecture:**
- Create migration `000051_create_refresh_tokens.up.sql` on the `public` schema.
- Update `backend/internal/domain/auth.go` with `RefreshToken` entity and interfaces.
- Update `backend/internal/repository/auth_repository.go` and `backend/internal/usecase/auth_usecase.go` with token issuance, rotation, and revocation.
- Add HTTP handlers for `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and `/api/v1/admin/users/{id}/revoke-sessions`.
- Update `frontend/src/services/api.ts` with Axios 401 response queue interceptor for silent token refresh.
- Configure Traefik v3 rate limit labels in `infrastructure/docker-compose*.yml`.
- Update documentation vault and test suite.

**Tech Stack:** Go 1.25, PostgreSQL 16, JWT (HS256 15m), SHA-256 token hashing, Axios interceptors, Traefik v3.

**Spec:** `docs/superpowers/specs/2026-10-03-refresh-tokens-and-traefik-ratelimit.md`

---

### Task 1: Database Migration `000051_create_refresh_tokens`
**Files:**
- Create: `backend/migrations/000051_create_refresh_tokens.up.sql`
- Create: `backend/migrations/000051_create_refresh_tokens.down.sql`

- [ ] **Step 1: Write migration up SQL**
  - Create table `public.refresh_tokens` with index on `user_id`, `token_hash`, `expires_at`.
- [ ] **Step 2: Write migration down SQL**
  - Drop table `public.refresh_tokens`.
- [ ] **Step 3: Apply migration to dev PostgreSQL database**
  - Run `docker compose exec backend /app/server -migrate` or manual psql.

---

### Task 2: Backend Domain, Repository, and Usecase
**Files:**
- Modify: `backend/internal/domain/auth.go`
- Modify: `backend/internal/repository/auth_repository.go`
- Modify: `backend/internal/usecase/auth_usecase.go`

- [ ] **Step 1: Add RefreshToken domain struct and repository interface**
- [ ] **Step 2: Implement repository methods for refresh token**
  - `StoreRefreshToken`, `GetRefreshTokenByHash`, `RevokeRefreshToken`, `RevokeAllUserRefreshTokens`.
- [ ] **Step 3: Implement usecase logic with token rotation and reuse detection**
  - Access token expiry changed to 15 minutes.
  - Refresh token expiry set to 14 days.
  - Opaque crypto token generated using `crypto/rand` and hashed with SHA-256.

---

### Task 3: Backend Delivery Handlers and Route Registration
**Files:**
- Modify: `backend/internal/delivery/http/auth_handler.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/delivery/http/auth_handler_test.go`

- [ ] **Step 1: Add Refresh, Logout, and RevokeSessions handler methods**
- [ ] **Step 2: Register routes in `main.go` and openapi spec**
- [ ] **Step 3: Run backend unit and integration tests**
  - `go test -v ./internal/delivery/http -run TestAuth`

---

### Task 4: Frontend Axios Silent Refresh Interceptor
**Files:**
- Modify: `frontend/src/store/useAuthStore.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/types/auth.ts`

- [ ] **Step 1: Store `refresh_token` in `useAuthStore`**
- [ ] **Step 2: Implement queue-based 401 retry interceptor in `api.ts`**
  - Pause outgoing requests on first 401.
  - Call `POST /auth/refresh`.
  - Re-issue failed requests with new access token or logout if refresh fails.
- [ ] **Step 3: Run frontend typecheck and build**
  - `npm run build`

---

### Task 5: Traefik v3 Native Edge Rate Limiter
**Files:**
- Modify: `infrastructure/docker-compose.yml`
- Modify: `infrastructure/docker-compose.staging.yml`
- Modify: `infrastructure/docker-compose.prod.yml`

- [ ] **Step 1: Add Traefik rate limit labels for API and auth endpoints**
- [ ] **Step 2: Verify Traefik configuration syntax**

---

### Task 6: Documentation Sync & Pre-Commit Validation
**Files:**
- Modify: `docs/01-architecture/authentication-and-rbac.md`
- Modify: `docs/03-database/migrations-history.md`
- Modify: `docs/03-database/schema-inventory.md`
- Modify: `docs/04-api-contracts/api-inventory.md`
- Modify: `docs/05-operations-devops/docker-and-traefik.md`
- Modify: `docs/08-roadmaps/distributed-caching-and-scaling.md`
- Run: `./scripts/validate-docs.py`

- [ ] **Step 1: Update documentation notes with migration 000051 and new endpoints**
- [ ] **Step 2: Add roadmap note for Distributed Caching & Redis (Tahap 3)**
- [ ] **Step 3: Run pre-commit validation to ensure 0 broken links**
