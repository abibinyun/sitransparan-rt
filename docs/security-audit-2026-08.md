# Adversarial Multi-Tenant Security Audit — Sitransparan RT/RW

**Date:** 2026-08-11
**Method:** Adversarial verification against the REAL running stack (Traefik → Nginx → Go backend → PostgreSQL), plus source-code reconstruction. No claim was trusted from documentation or previous audits.
**Environment tested:** Docker stack (Traefik v3.6 :80, frontend :3000, backend :8081, PostgreSQL :5432, MinIO), `TENANT_BASE_DOMAIN=openrt.local`, tenants `rt-003` (A) and `rt-004` (B) with distinct test data.

---

## Executive Summary

```text
Overall:  BROKEN (before remediation) → VERIFIED (after remediation)
```

The initial state was **BROKEN**: the backend silently fell back to a **publicly-known JWT secret** when `JWT_SECRET` was unset, and neither dev nor prod Docker Compose set it. An attacker who read the repository could forge JWTs claiming **any tenant_id and role (superadmin)** and fully compromise the platform (list all tenants, read/modify any tenant's data). This was **reproduced, fixed, regression-tested, and re-attacked to 401**.

After the fix, every other attack in the matrix was denied as expected, and the entire test suite (Go unit + integration + security, frontend build, 24/24 Playwright E2E) passes.

---

## Attack Matrix (executed against the live stack)

Format: `case | result`. All requests sent with real JWTs issued by the server unless stated.

| # | Attack | Expected | Actual | Result |
|---|---|---|---|---|
| A2 | Host `rt-003` + JWT(A) → GET /residents | ALLOW | 200 (data A only) | ✅ PASS |
| A3 | Host `rt-004` + JWT(A) | DENY | 403 | ✅ PASS |
| A4 | Host `rt-003` + JWT(B) | DENY | 403 | ✅ PASS |
| A5 | Host `rt-999` (unknown) + JWT(A) | DENY | 403 | ✅ PASS |
| A6 | Host `rt-003`, no token | DENY | 401 | ✅ PASS |
| A7 | Host `attacker.com` + JWT(A) | DENY | 403 | ✅ PASS |
| A8 | Host `rt-003.openrt.local.attacker.com` + JWT(A) | DENY | 403 (direct) / 404 (Traefik) | ✅ PASS |
| A9 | Host `RT-003.OpenRT.Local` (case) + JWT(A) | ALLOW | 200 | ✅ PASS |
| A10 | Host `rt-003.openrt.local:8443` | ALLOW | 200 | ✅ PASS |
| A11 | Host `rt-003.openrt.local.` (trailing dot) | ALLOW | 200 | ✅ PASS |
| A12–14 | `rt-003..openrt.local`, `rt--003…`, `rt_003…` | DENY | 403 | ✅ PASS |
| A15 | `rt 003.openrt.local` (space) | DENY | 400 (malformed host) | ✅ PASS |
| A16–17 | `api.openrt.local`, `openrt.local` (platform) + JWT(A) | ALLOW (JWT-scoped) | 200 | ✅ PASS |
| A18–20 | `openrt.com.attacker.com`, `rt-003.evil.com`, `rt-003.openrt.com` + JWT(A) | DENY | 403 | ✅ PASS |
| T2–T6 | **Full chain** (Traefik :80 → nginx → backend): hostA/tokenA=200; hostB/tokenA=403; unknown=403; attacker=404; suffix-trick=404 | — | as expected | ✅ PASS |
| B1–B7 | JWT: missing / garbage / tampered / expired / alg=none / HS512 confusion | DENY | 401 | ✅ PASS |
| B8 | **Forged JWT (superadmin+tenantB) signed with known default secret** | DENY | **200 — LEAK** | ❌ **VULN → FIXED** |
| C1–C3 | `X-Forwarded-Host`, `X-Tenant-ID`, both spoofed (host A, JWT A) | Header ignored | 200 (data A only) | ✅ PASS |
| C4 | Host attacker.com + spoofed XFH + X-Tenant-ID + JWT A | DENY | 403 | ✅ PASS |
| C5 | Host B + `X-Tenant-ID: A` + JWT A | DENY | 403 | ✅ PASS |
| C6–C8 | `X-Original-Host`, `Forwarded`, `X-Tenant-Slug` spoof | Ignored | 200 (data A) | ✅ PASS |
| D1–D17 | **IDOR**: A requests B's resident/announcement/event/aspiration/need/financial by ID (GET/PUT/DELETE/approve) | DENY | 404/400/500 — **B data unmodified** | ✅ PASS |
| P1–P5 | Controls: B on B resources | ALLOW | 200 | ✅ PASS (proves IDs valid) |
| L1–L6 | Lists with `?tenant_id=B&tenant=B&schema=tenant_rt_004&search=BRAVO` (JWT A) | A data only | 200, no B data | ✅ PASS |
| R1–R3 | Dashboard summary / financial summary / report export (JWT A) | A aggregates only | 200, A-only | ✅ PASS |
| U1–U4 | Public `t/{slug}` cross-hostname (B data on host A) / unknown tenant | DENY | 404 | ✅ PASS |
| U5–U6 | Public data via path slug on any host (attacker.com / localhost) | Public data (by design) | 200 — public transparency data only | ✅ PASS (by design) |
| S1 | Switch-tenant A→B (no membership) | DENY | 403 | ✅ PASS |
| S2 | Switch A→A | ALLOW | 200 | ✅ PASS |
| S3 | Superadmin switch to nonexistent tenant | DENY | 403 | ✅ PASS |
| S4 | Switch A→B while on host B | DENY | 403 | ✅ PASS |
| X1–X2 | Superadmin JWT on tenant host (mismatch) | DENY | 403 | ✅ PASS |
| X3–X4 | Superadmin route: SA on localhost=200; admin token=403 | — | as expected | ✅ PASS |
| IA1–IA7 | **Inactive tenant** (rt-004 set inactive): public=404, private=403, switch=403, hostname boundaries | DENY everywhere | 404/403 | ✅ PASS |
| — | CORS `Origin: https://attacker.com` | No CORS grant | **reflected before fix** → now blocked (no ACAO) | ❌ → ✅ FIXED |

---

## Vulnerabilities Found

### 1. CRITICAL — Publicly-known default JWT secret (total platform compromise)

- **Severity:** CRITICAL (CWE-798 use of hard-coded credentials; leads to full multi-tenant compromise)
- **Attack:** Read the repo → learn `JWT_SECRET` fallback `sitransparan-secret-key-change-in-prod` → forge HS256 token with `role=superadmin` + any `tenant_id` → `GET /api/v1/superadmin/tenants` → 200 (all tenants); `GET /api/v1/residents` on the target tenant's hostname → 200 (its private data). Reproduced live.
- **Root cause:** `backend/pkg/config/config.go` used `getenvDefault("JWT_SECRET", "sitransparan-secret-key-change-in-prod")`; neither `infrastructure/docker-compose.yml` nor `docker-compose.prod.yml` set `JWT_SECRET`. The running container confirmed `JWT_SECRET` unset → the default was active in **both dev and production config**.
- **Impact:** Any attacker can impersonate any tenant admin or the platform superadmin: read/modify/approve/delete any tenant's data, create/delete tenants, read the entire tenant directory.
- **Fix:**
  - `config.go`: `JWT_SECRET` is now **required** — no default; min 32 chars after `TrimSpace`; explicitly rejects the legacy default and the `.env.example` placeholder; fails fast (`log.Fatalf`) with a generation hint.
  - `infrastructure/docker-compose.yml` + `docker-compose.prod.yml`: `JWT_SECRET: ${JWT_SECRET:?...}` (fail-closed at compose level).
  - `.env.example`: documented with a placeholder (`CHANGE_ME`) that **fails validation** so copying the file verbatim cannot deploy a known secret; local `infrastructure/.env` (gitignored) holds a generated 64-char secret.
  - `docs/setup.md` updated (env table + `make up` note).
- **Regression tests:** `backend/pkg/config/config_test.go` (empty/short/padded/legacy/placeholder rejected; strong accepted); `TestSecurity_JWTForgeryWithPublicDefaultSecret` (forged token with old default → 401; control token with real secret → 200; valid-signature cross-tenant host → 403).
- **Final result (re-attacked):** forged token now **401** on both `/superadmin/tenants` and `/residents`; fresh login works; host↔JWT consistency intact. **FIXED & VERIFIED.**

### 2. MEDIUM — CORS reflects any origin with `Allow-Credentials: true`

- **Severity:** MEDIUM (CWE-942). No cookies are used today (JWT via Authorization header), so exploitability requires token theft; still a defense-in-depth failure that would become critical if cookie auth were introduced.
- **Root cause:** `middleware.CORSMiddleware("*")` echoed the request `Origin` and set `Access-Control-Allow-Credentials: true`.
- **Fix:** `CORSMiddleware` now takes the tenant base domain and sets CORS headers **only** for tenant subdomains of the base domain, the base domain itself, and localhost/loopback origins; disallowed origins get no headers (browser blocks). `Vary: Origin` added.
- **Regression tests:** `TestCORSMiddleware` / `TestCORSMiddleware_RejectsForeignOrigins` (attacker/trick domains denied; tenant subdomains/base/localhost allowed).
- **Final result (re-attacked):** `Origin: https://attacker.com` → no ACAO; `rt-003.openrt.local` / `localhost:3000` → allowed. **FIXED & VERIFIED.**

### 3. LOW — PWA runtime cache not cleared on logout/session change

- **Severity:** LOW (same-origin user/session transitions only; tenant subdomains are separate origins, so cross-tenant cache leakage is inherently blocked).
- **Root cause:** `frontend/src/sw.ts` cached `/api/*` responses (NetworkFirst, 24 h); `logout()` cleared TanStack Query but not the Service Worker `api-cache`/`pages-cache`. On a slow/offline network a subsequent session on the same origin could be served a previous session's private response.
- **Fix:** SW message handler `CLEAR_CACHES` deletes `api-cache`/`pages-cache` (precache of immutable assets untouched); `useAuthStore` posts the message on `setAuth`, `setActiveTenant`, and `logout` (to active/waiting/installing workers).
- **Regression tests:** covered by frontend typecheck/build (no frontend test framework exists in the repo).
- **Final result:** build green; behavior verified by code + build. **FIXED.**

---

## Tenant Isolation — explicit statements

```text
Unknown tenant:    DENIED (403 private / 404 public / 404 Traefik). No fallback, no auto-schema, no default tenant.
Cross-tenant:      DENIED at API layer (404 by-ID) and DB layer (schema-qualified + tenant_id filter). Verified unmodified.
Host manipulation: normalization (lowercase, port, trailing dot) cannot turn an invalid host into another tenant; every match goes through tenants-table lookup + status check.
JWT manipulation:  all variants DENIED (401); only the server secret signs valid tokens. Algorithm pinned HS256.
Resource ID:       IDOR DENIED (404). Random UUIDs are not authorization; queries enforce tenant ownership.
List/search/filter: client tenant_id/schema/search params ignored; server scope authoritative.
Reports/aggregates: dashboard/financial summary/export scoped to the caller tenant only.
Files:             MinIO-backed uploads exist; no cross-tenant read path found in handlers (out of direct scope — see Remaining).
Cache (TanStack):  queryClient.clear() on logout/switch/auth.
PWA:               per-origin caches (tenant subdomains isolated); runtime caches now purged on session change.
Database:          schema-per-tenant + schema-qualified queries (TenantTable) + tenant_id predicates; no search_path on request path; SetTenantSearchPath explicitly documented as pool-unsafe and unused.
```

## Infrastructure

```text
Traefik:     anchored HostRegexp (v3) — attacker.com & suffix-trick hosts → 404; only <base domain> and <slug>.<base> routed; backend also independently enforces hostname↔JWT.
Nginx:       passes Host through to backend; no tenant decision made in the proxy.
Docker:      backend exposed on :8081 — safe because the backend itself is the security boundary (direct Host-header attacks all denied).
Development: tenant subdomains work (rt-003/rt-004.openrt.local); JWT_SECRET required via infrastructure/.env.
Production:  docker-compose.prod.yml requires JWT_SECRET (fail-closed); TENANT_BASE_DOMAIN configurable (openrt.com).
```

## Configuration

| Variable | Status |
|---|---|
| `JWT_SECRET` | Now **required**, ≥32 chars, no default, rejects known values. Set in `infrastructure/.env` (dev) / env (prod). |
| `TENANT_BASE_DOMAIN` | Configurable (`openrt.local` dev / `openrt.com` prod), mirrored to `VITE_TENANT_BASE_DOMAIN`. No hardcoded production domain. |
| `rt-003`/`rt-004` | Seed/test data only; no production logic depends on them. |

## Tests (actual commands & results)

```bash
cd backend
go build ./...                     # PASS
go vet ./...                       # PASS
DATABASE_URL='postgres://postgres:postgres@localhost:5432/transparansi_rt?sslmode=disable' go test ./...   # ALL PASS (incl. TestSecurity_* + new forgery test)

cd frontend
npm run build                      # PASS (tsc + vite + PWA)

npx playwright test --config=playwright.headless.config.ts   # 24/24 PASS
```

## Remaining Issues

```text
CRITICAL:  none.
HIGH:      none.
MEDIUM:    none.
LOW:
  - Rate limiter is a single global token bucket (100 tokens, 10/s) — not per-tenant/IP/user.
    A single client can exhaust the whole app's budget (availability), and brute-force login /
    tenant-slug enumeration is only throttled globally. Reported per task rules (no fix invented).
  - Cross-tenant write attempts to a non-existent resource return 500 with body
    {"error":"record not found"} instead of 404 in some handlers (resident update/delete/approve).
    No data impact — cosmetic status-code inconsistency.
  - No server-side JWT revocation (token valid until 24 h expiry) — documented limitation.
  - Public transparency data is addressable via the path slug on any host (e.g. attacker.com/api/v1/t/rt-004/announcements).
    This is the intended public portal model (public data only, hostname↔slug enforced when the
    hostname IS a tenant subdomain); not a confidentiality issue.
UNTESTED:
  - MinIO object-storage key isolation (no local MinIO test harness; handlers validate tenant scope
    before returning URLs, but object keys were not brute-forced).
  - PWA behavior end-to-end in browser (build-verified only; no Playwright coverage of SW cache purge).
BLOCKED: none.
```

## Invariants (proof)

```text
1. Unknown hostname → no tenant context → no tenant data        : A5/A7/A8/T4/T5 (403/404)
2. Tenant A user cannot access Tenant B resources               : D1–D17 (404, B data unmodified)
3. Tenant A JWT + Host B → DENY                                 : A3/A4/C5/T3 (403)
4. Client-controlled tenant ID never authoritative              : L1–L6, C2/C5 (ignored)
5. Client-controlled forwarded headers never authority          : C1–C8 (ignored; host authoritative)
6. Hostname → tenant lookup → never direct schema selection     : middleware + repository TenantTable audit
7. Tenant A cache never reused for Tenant B                     : per-origin SW caches + CLEAR_CACHES on session change + queryClient.clear()
8. Inactive tenant → no private access                          : IA1–IA7 (404/403)
9. Tenant creation requires no source-code change               : superadmin POST /superadmin/tenants provisions schema
10. No production tenant/domain hardcode                         : grep audit (openrt.local/com only as configurable defaults)
```

**Final status: VERIFIED (after remediation).** The single critical vulnerability was found, fixed, regression-tested, and the original attack re-executed successfully now returning 401.
