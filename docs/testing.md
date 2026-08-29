# Testing — Sitransparan RT/RW

Ringkasan suite test aktual dan cara menjalankannya. Proses audit E2E di `AGENTS.md`.

---

## 1. Backend: Unit, Integration & Security Test (104 + 7)

Test Go (`*_test.go`) berdampingan source.

```bash
cd backend
go build ./...
go vet ./...
go test ./...        # -count=1 tanpa cache
# go test ./... : 104 tests + 7 security (cross-tenant, escalation, RBAC, social isolation, meeting visibility)
```

Coverage per package:

| Package | Cakupan |
|---|---|
| `internal/delivery/http` | handler tests + **security integration tests** (`TestSecurity_*` 7 tests): cross-tenant matrix, role escalation, RBAC, superadmin protection, public sanitasi, **social isolation** (reaction/poll cross-tenant), **meeting visibility** |
| `internal/delivery/http/middleware` | auth (valid/expired/tampered/missing), RBAC, tenant, **rate limiter** (per-IP, exempt `/health`/`/swagger`, XFF trusted-proxy & CIDR, spoof reject, `Retry-After`, refill) |
| `internal/repository` | tenant isolation (`tenant_isolation_test.go`) |
| `internal/usecase` | auth, resident, financial (funds `is_default` guard), event (budget agregat, status filter), aspiration_need, announcement_doc (`media_urls`), dashboard, meeting, social, push |
| `pkg/crypto` | AES-256-GCM + HMAC (panic jika `NIK_ENCRYPTION_KEY` ≠32 di prod) |

### Security tests (security_integration_test.go — 7)

| Test | Verifikasi |
|---|---|
| `TestSecurity_CrossTenantMatrix` | A→A allow, A→B deny, dll; by-ID; spoof header/query diabaikan |
| `TestSecurity_RoleEscalation` | admin→superadmin 403; admin→resident 201; tenant spoof diabaikan |
| `TestSecurity_RBACEnforcement` | warga write →403, read →200 |
| `TestSecurity_SuperadminAccountProtection` | cross-tenant delete superadmin ditolak |
| `TestSecurity_PublicSanitization` | aspirasi publik tanpa `resident_id`; public endpoints sanitasi |
| `TestSecurity_SocialIsolation` | reaksi/poll_votes unique constraint, cross-tenant isolation |
| `TestSecurity_MeetingVisibility` | warga dipaksa `public`, 403 non-public, action items hidden |

## 2. Frontend: Typecheck + Build

```bash
cd frontend
npm run build   # tsc && vite build (typecheck + bundle + PWA)
```

Tidak ada framework unit test frontend (hanya `tsc` + `vite build`). `social.ts` fix double prefix, `push.ts` via `api`, `dashboard` blob, `PollsPage` semua terverifikasi build.

## 3. E2E Playwright (64 tests)

Suite `tests/e2e/` — **64 tests** (62 + `polls-ui` + dashboard blob), mencakup: auth, public portal, admin dashboard, announcements, aspirations, events, meetings, finance, residents, roles (admin_rt/resident/superadmin/public), superadmin tenants, users, isolation.

- `residents/` — CRUD + family + filter `is_head_of_family` + validasi
- `finance/` — funds (is_default guard), categories, dues `status` filter + verify, transactions append-only, summary, upload
- `events/events-workflow` — create → RAB budget persist via API → RSVP → delete; filter `status` backend terverifikasi
- `announcements/announcements-crud` — CRUD + sync portal publik + `residents_only` hidden dari anonim
- `meetings/meetings-authz` — warga ditolak tulis, `visibility=confidential` server-side, isolasi lintas-hostname
- `admin/dashboard-metrics` — saldo = income−expense, API summary match, export CSV blob + PDF blob
- `polls-ui` — create poll 2–6 opsi, vote, close, public agregat
- `isolation/tenant-isolation` — lintas tenant via hostname `rt-003`/`rt-004` (UI + direct URL + API 403/200)
- `roles/negative-authz` — warga ditolak halaman/API admin; admin_rt ditolak superadmin

`helpers.ts` login/parse Rupiah/NIK deterministik. Headless config pakai `--host-resolver-rules` (tanpa `/etc/hosts`).

```bash
# Butuh stack (make up) di http://localhost:3000
npx playwright test                                          # headed (slowMo 300)
npx playwright test --config=playwright.headless.config.ts   # headless (CI)
```

- `baseURL`: `http://localhost:3000`
- Credentials: `superadmin@platform.local`/`admin123`, `admin@sitransparan.rt`/`password123`
- Laporan: jalankan ulang untuk hasil terkini (tidak always valid dari git history).

## 4. Manual Testing

Matriks fitur & use case di [authentication-authorization.md](./authentication-authorization.md) dan [api.md](./api.md).

## 5. Keterbatasan

| Item | Status |
|---|---|
| MinIO storage unit test | **Terintegrasi local dev** (`pkg/storage/minio` bucket `sitransparan-files`, per-tenant prefix, fallback `/uploads`). Unit test masih butuh MinIO running; E2E verifikasi upload via API. |
| Frontend unit test | Tidak ada (hanya `tsc` + build) |
| Push E2E | VAPID keys kosong di dev → push disabled graceful (config `enabled:false`). Test push via `GET /push/config` |

