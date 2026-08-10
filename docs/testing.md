# Testing — Sitransparan RT/RW

Ringkasan suite test aktual dan cara menjalankannya. Proses audit E2E mandiri project diatur di `AGENTS.md`.

---

## 1. Backend: Unit, Integration & Security Test

Test ditulis dalam Go (`*_test.go`) berdampingan dengan source.

```bash
cd backend
go build ./...
go vet ./...
go test ./...        # -count=1 untuk tanpa cache
```

Coverage per package:

| Package | Cakupan |
|---|---|
| `internal/delivery/http` | handler tests + **security integration tests** (`TestSecurity_*`): cross-tenant matrix, role escalation, RBAC enforcement, superadmin account protection, public sanitization |
| `internal/delivery/http/middleware` | auth middleware (valid/expired/tampered/missing token), RBAC, tenant |
| `internal/repository` | tenant isolation test (`tenant_isolation_test.go`), repos |
| `internal/usecase` | auth, resident, financial, event, aspiration_need, dashboard, user |
| `pkg/crypto` | AES-256-GCM + HMAC |

### Test keamanan (security_integration_test.go)

| Test | Memverifikasi |
|---|---|
| `TestSecurity_CrossTenantMatrix` | A→A allow, A→B deny, B→A deny, B→B allow; resource by-ID; spoof header/query diabaikan |
| `TestSecurity_RoleEscalation` | admin→superadmin 403; admin→resident 201; body tenant spoof diabaikan |
| `TestSecurity_RBACEnforcement` | warga write → 403, read → 200 |
| `TestSecurity_SuperadminAccountProtection` | cross-tenant delete akun superadmin ditolak |
| `TestSecurity_PublicSanitization` | aspirasi publik tidak mengekspos `resident_id` |

## 2. E2E Playwright

Suite di `tests/e2e/` (peran: auth, public portal, admin dashboard, announcements, aspirations, events, roles admin_rt/resident/superadmin/public, superadmin tenants, users).

```bash
# Butuh stack berjalan (make up) di http://localhost:3000
npx playwright test                                          # headed (config default, slowMo 300)
npx playwright test --config=playwright.headless.config.ts   # headless (CI)
```

- `baseURL`: `http://localhost:3000`
- Default credentials yang dipakai test: `superadmin@platform.local` / `admin123`, `admin@sitransparan.rt` / `password123`.
- Laporan satu kali (bukan hasil yang selalu valid): lihat riwayat di git; jalankan ulang untuk hasil terkini.

## 3. Manual Testing

Panduan manual pengujian fitur per role (skenario M-01 s.d. M-10) telah dirangkum ke dalam matriks fitur & use case di [authentication-authorization.md](./authentication-authorization.md) dan [api.md](./api.md). Untuk menjalankan ulang E2E, ikuti perintah di atas.

## 4. Keterbatasan Lingkungan Test

| Item | Status |
|---|---|
| MinIO storage unit test | BLOCKED — tidak ada MinIO terkonfigurasi di environment test lokal (`backend/pkg/storage/minio` [no test files]) |
| Frontend unit test | Tidak ada framework test frontend (hanya typecheck via `npm run build`) |
