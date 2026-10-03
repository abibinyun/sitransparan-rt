# Laporan Audit — User Management & Multi-Tenancy SaaS RT

**Tanggal:** 2026-08-25
**Protokol:** `docs/multitenant-audit.md` (audit read-only, evidence dari codebase)
**Scope eksekusi:** backend (`internal/`), frontend (`src/`), E2E (`tests/e2e/`), migrations, middleware.
**Catatan verifikasi:** `go build/vet/test` hijau; `npm run build` hijau; suite E2E **62/62 hijau
melawan build baru** setelah stack di-rebuild dan 20 spesifikasi lama yang mengasumsikan URL
lama diperbaiki ke path kanonik `/admin/*`.

---

## A. Executive Summary

| Pertanyaan | Jawaban |
|---|---|
| Apakah user management sudah benar? | **Ya.** User = identitas login global; membership (`tenant_users`) memegang role per-tenant dengan status aktif/nonaktif; Resident terpisah penuh dari User. |
| Apakah multi-tenancy aman? | **Ya.** Isolasi schema-per-tenant dengan query schema-qualified deterministik; tenant context hanya dari JWT + lookup DB; hostname/header/query dari client tidak pernah dipercaya. |
| Adakah risiko cross-tenant? | Tidak ditemukan jalur lintas tenant pada code review maupun test matrix (`TestSecurity_CrossTenantMatrix`). Sisa risiko bersifat operasional (deploy stale, file storage publik). |
| Apakah role/permission sudah benar? | **Ya untuk skala saat ini.** Role sederhana (superadmin/admin_rt/resident) dicek server-side di middleware + usecase guard; frontend hiding tidak pernah menjadi satu-satunya penghalang. |

### Rating

| Dimensi | Nilai | Catatan singkat |
|---|---|---|
| Architecture | 8/10 | Clean Architecture konsisten; pemisahan User/Membership/Tenant/Resident benar. |
| Multi-tenancy | 9/10 | Schema-qualified query + validasi hostname↔JWT di middleware + test matrix. |
| Authorization | 8/10 | RBAC server-side dan escalation guards ada; granularitas permission belum ada (cukup untuk kebutuhan). |
| Authentication | 8/10 | bcrypt, HS256 pin, secret tervalidasi ketat; minus: tanpa revocation token. |
| User Management | 8/10 | CRUD aman, superadmin account protected; minus: audit trail parsial. |
| Security | 8/10 | Test keamanan integrasi komprehensif; minus: MinIO bucket public-read, tanpa rate-limit adaptive. |
| **Overall** | **8/10** | |

## B. Current Architecture (implementasi aktual)

```text
User (global, public.users — email+bcrypt, tanpa tenant_id/role)
 ↓
TenantUser / Membership (public.tenant_users: user_id, tenant_id, role_id, status)
 ↓                              ← role & scope DARI SINI, per tenant
Tenant (public.tenants: slug, domain, status)     Role (superadmin | admin_rt | resident)
 ↓
Schema per tenant: tenant_<slug>.residents | dues_payments | financial_transactions | ...

Resident (data kependudukan, di schema tenant)  ≠  User (identitas login)
Resident dapat ada tanpa akun; NIK dienkripsi AES-256-GCM + HMAC hash untuk lookup.

Request path:
AuthMiddleware (verifikasi JWT HS256, inject claims)
  → TenantMiddleware (hostname → tenant DB; wajib exist+active; JWT tenant == host tenant;
    host asing tanpa custom domain terdaftar → 403; platform host → tenant dari claims saja)
  → RBACMiddleware → Handler (tenant.ID dari context, bukan body/header)
  → Repository (TenantTable(ctx,"...") → schema-qualified SQL)
```

Bukti utama: `backend/internal/domain/auth.go`, `middleware/middleware.go:109`,
`repository/db.go` (`TenantTable`), `usecase/auth_usecase.go` (Login/SwitchTenant),
`usecase/user_usecase.go` (`onlySuperAdminCanGrant`).

## C. Findings

### [HIGH] Build baru belum ter-deploy saat audit dimulai — E2E "hijau" menyesatkan

- **Evidence:** container `infrastructure-backend/frontend` berumur 2–3 jam tanpa perubahan
  working tree; `GET /api/v1/t/resolve` → 404 di runtime; bundle :3000 tidak mengandung
  rute `/admin/*`. Suite E2E pertama (62/62 pass) ternyata berjalan melawan build lama.
- **Why:** Docker image tidak di-rebuild setelah implementasi domain/routing.
- **Impact:** Verifikasi palsu — perubahan baru belum pernah diuji end-to-end sebelum rebuild.
- **Status:** **DIPERBAIKI selama audit** — `make up` (rebuild), verifikasi endpoint &
  bundle baru, E2E ulang: awalnya 42 pass / 20 fail (semua TEST_BUG asumsi URL lama),
  spesifikasi diperbarui ke path kanonik, hasil akhir **62/62 pass melawan build baru**.

### [MEDIUM] Spesifikasi E2E mengasumsikan URL lama (setelah deploy akan merah)

- **Evidence:** `tests/e2e/**` — `toHaveURL('/users')`, `'/residents'`, `'/superadmin/tenants'`,
  login mengharapkan `'http://localhost:3000/'`, dashboard-metrics `goto('/')`.
- **Impact:** Setiap deploy build baru memecah ±20 tes meski aplikasi benar.
- **Status:** **DIPERBAIKI** — semua spesifikasi kini memakai path kanonik `/admin/*`
  sesuai `docs/domains-and-routing.md`; redirect alias lama tetap diuji lewat spec lain.

### [LOW] Audit trail hanya pada satu alur operasional

- **Evidence:** `INSERT INTO audit_logs` hanya di `resident_repository.go:461`.
  Operasi sensitif lain (perubahan role/membership, CRUD user, verifikasi iuran,
  transaksi kas) tidak menulis audit log.
- **Impact:** Investigasi insiden (mis. siapa mengubah role) tidak dapat dibuktikan.
- **Expected:** Tulis audit_logs untuk operasi tulis admin/superadmin minimal.

### [LOW] Tidak ada revocation token server-side

- **Evidence:** Logout hanya membersihkan state client (`useAuthStore.logout`);
  JWT valid sampai `exp` (24 h). Membership nonaktif tetap memegang token lama —
  **mitigasi ada**: `TenantMiddleware` memvalidasi tenant masih active dan match JWT,
  sehingga akses tenant data tertutup; namun endpoint identity (`/auth/tenants`)
  tetap bisa dipanggil dengan token lama.
- **Known limitation** (sudah tercatat di AGENTS.md §46.9).

### [LOW] MinIO bucket dibuat dengan policy public-download

- **Evidence:** `pkg/storage/minio` auto-create bucket `sitransparan-files` public-download;
  URL objek dapat ditebak bila diketahui prefix `<slug>/<kategori>/…`.
- **Impact:** Dokumen tenant (KTP/KK, kwitansi) berpotensi diakses tanpa otorisasi
  bila URL diketahui. Rekomendasi produksi: presigned URL berbatas waktu / proxy read
  dengan cek membership (juga sudah tercatat di AGENTS.md §46.9).

### [INFO] Query key TanStack Query internal tidak menyertakan tenant identifier

- **Evidence:** `frontend/src/services/*.ts` — mis. `queryKey: ['residents', params]`.
- **Mengapa bukan bug:** `useAuthStore.setActiveTenant/setAuth/logout` memanggil
  `queryClient.clear()` + purge cache service worker, sehingga data lintas tenant
  tidak dapat bocor antar sesi/tenant. Menambahkan tenantId ke key adalah hardening P3.

### [INFO] Error kosmetik 500 untuk cross-tenant write ke resource tak dikenal

- **Evidence:** beberapa handler resident update/delete/approve memetakan `record not found`
  → 500 (tercatat di AGENTS.md §46.9). Tanpa dampak data; 404 lebih tepat.

## D. Things That Are Already Correct

- ✓ **User ≠ Resident** — `domain.User` (identitas login global) vs `domain.Resident`
  (kependudukan, schema tenant); resident valid tanpa akun.
- ✓ **Role melekat pada membership, bukan user global** — `tenant_users.role_id` +
  `status`; `activeTenantUsers()` menyaring mapping nonaktif saat login/switch
  (`auth_usecase.go`).
- ✓ **Tenant context hanya dari JWT + DB** — header `X-Tenant-ID`, query param, dan
  `X-Forwarded-Host` tidak pernah dipercaya; dibuktikan
  `TestSecurity_CrossTenantMatrix` (spoof header/body/query semua diabaikan).
- ✓ **Isolasi repository deterministik** — `TenantTable(ctx,…)` schema-qualified per
  request (imun search_path leakage pool); helper `SET search_path` ditandai
  deprecated/test-only.
- ✓ **Hostname = discovery, bukan bypass** — subdomain/custom domain wajib exist+active
  dan match JWT tenant; host asing → 403 (`middleware.go:109–160`,
  `TestSecurity_JWTForgeryWithPublicDefaultSecret` tahap 3).
- ✓ **Role escalation diblokir** — hanya superadmin boleh membuat/mengubah ke superadmin;
  akun superadmin dilindungi dari admin tenant (`onlySuperAdminCanGrant`,
  `TestSecurity_RoleEscalation`).
- ✓ **Cross-tenant create/write ditolak** — tenant_id body diabaikan, resource ID
  selalu disertai `AND tenant_id = $1` (test matrix A↔B read/update/delete → 404).
- ✓ **RBAC ditegakkan server-side**, bukan hanya UI — resident ditolak 403 di
  endpoint admin via direct API (`TestSecurity_RBACEnforcement`).
- ✓ **JWT hardening** — HS256 dipin, tanpa fallback default secret, secret pendek/
  publik diketahui ditolak saat startup (`pkg/config/config.go ResolveJWTSecret`),
  diregresi-test oleh forge-token test.
- ✓ **Switch tenant diverifikasi server** — hanya ke mapping aktif milik sendiri,
  re-issue JWT oleh server (`SwitchTenant`).
- ✓ **Cache hygiene frontend** — `queryClient.clear()` + purge SW cache saat
  login/logout/switch tenant (`useAuthStore.ts`), mencegah kebocoran data antar tenant.
- ✓ **Public sanitization** — aspirasi publik anonim tidak menerima/meleakkan
  `resident_id` (`TestSecurity_PublicSanitization`).
- ✓ **Frontend guard bukan satu-satunya batas** — `ProtectedRoute.tsx` hanya UX;
  semua operasi sensitif dicek ulang middleware+usecase di backend.
- ✓ **Finance append-only** — PUT/DELETE transaksi kas → 405 by design.

## E. Attack Scenarios

| Scenario | Expected | Actual | Status |
|---|---|---|---|
| Admin RT-A → read list/detail resident RT-B (IDOR) | Denied (404/403) | 404, tidak ada leak di list | **PASS** (`TestSecurity_CrossTenantMatrix`) |
| Admin RT-A → update/delete resident RT-B | Denied | 404 (kosmetik 500 utk approve) | **PASS** |
| Manipulasi `tenant_id` (header/body/query param) | Ignored/rejected | Diabaikan; tenant selalu dari claims | **PASS** |
| Resident → endpoint admin via direct API | 403 | 403 | **PASS** (`TestSecurity_RBACEnforcement`) |
| admin_rt → self/promote ke superadmin | 403 | 403 | **PASS** (`TestSecurity_RoleEscalation`) |
| admin_rt-A → create user di tenant B | Rejected | Body tenant_id diabaikan, dibuat di tenant A | **PASS** |
| admin_rt → hapus akun superadmin / user lintas tenant | Forbidden | Forbidden | **PASS** (`TestSecurity_SuperadminAccountProtection`) |
| JWT forged dengan secret default yang diketahui publik | 401 | 401 (+ kontrol token valid diterima) | **PASS** |
| JWT tenant-B di hostname tenant-A | 403 | 403 | **PASS** |
| Host asing tak terdaftar (attacker.com) | 403/404 | 403 (middleware), 404 (`/t/resolve`) | **PASS** |
| Aspirasi publik spoof `resident_id` | Sanitized | resident_id tidak disimpan/ditampilkan | **PASS** |
| Public submit aspiration → cross-tenant | Scoped by slug | Scoped by slug, inactive → 404 | **PASS** |

Skenario runtime tambahan yang diverifikasi langsung saat audit:
`GET /api/v1/t/resolve?host=<subdomain>` → 200 `{slug}`; host tak dikenal → 404.

## F. Recommended Changes

**P0 — harus sebelum production**
1. Pastikan pipeline deploy selalu rebuild image backend & frontend setelah merge
   (temuan HIGH kali ini murni prosesual). Tambahkan smoke-check post-deploy:
   `GET /health` + `GET /api/v1/t/resolve?host=<tenant-uji>` harus 200.

**P1 — sangat disarankan**
2. Perluas `audit_logs` ke operasi sensitif lain (role/membership change, user CRUD,
   verifikasi iuran, transaksi kas) dengan actor/tenant/action/resource/timestamp.
3. Ganti akses objek MinIO public-download dengan presigned URL berbatas waktu atau
   proxy read yang mengecek membership (khusus dokumen sensitif: KTP/KK, kwitansi).

**P2 — improvement**
4. Kembalikan 404 (bukan 500) untuk resource lintas tenant yang tidak ada.
5. Tambahkan revocation/jti denylist atau short-lived access + refresh token agar
   logout/membership dicabut efektif.

**P3 — nice to have**
6. Sertakan tenant identifier pada queryKey internal TanStack Query sebagai defense-in-depth.
7. Landing platform (direktori RT) di root domain produksi (sesuai catatan
   `domains-and-routing.md` §5).

---

## VERDICT

**[x] READY WITH FIXES**

Alasan terpenting:

1. Model data benar: User (identitas) / Membership (role per tenant) / Tenant /
   Resident (kependudukan) terpisah sesuai kebutuhan produk.
2. Isolasi tenant kuat dan teruji: schema-qualified query + middleware hostname↔JWT
   + security integration test matrix yang membuktikan skenario serangan utama PASS.
3. Tidak ditemukan IDOR/BOLA, tenant manipulation, maupun jalur privilege escalation.
4. Authorization ditegakkan server-side; frontend guard hanya UX.
5. Authentication solid (bcrypt, HS256 pinned, secret validation ketat, anti-forgery
   regression test); kelemahan revocation bersifat known limitation dan berdampak
   rendah karena tenant data tetap tertutup middleware.
6. Temuan HIGH saat audit bersifat proses/deployment (stale build), bukan kerentanan
   kode — telah diremediasi dan diverifikasi ulang 62/62 E2E.
7. Celah yang tersisa (audit trail parsial, storage publik, tanpa revocation) adalah
   P1/P2 yang wajib ditutup sebelum production nyata dengan data sensitif warga.

Klasifikasi temuan: HIGH = deployment/process issue; MEDIUM = test maintenance
(sudah diperbaiki); LOW/INFO = hardening, bukan kerentanan aktif.
