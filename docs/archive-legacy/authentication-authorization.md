# Autentikasi & Otorisasi — Sitransparan RT/RW

Dokumen ini menggambarkan model autentikasi, JWT, RBAC, isolasi tenant, dan otorisasi resource **aktual** sesuai implementasi backend (`backend/internal/usecase/auth_usecase.go`, `backend/internal/delivery/http/middleware/`, `backend/internal/usecase/user_usecase.go`, `backend/pkg/crypto/`, `backend/pkg/config/`) dan frontend.

---

## 1. Autentikasi

- **Login**: `POST /api/v1/auth/login` (email + password, bcrypt). Mengembalikan JWT dan data user. Body opsional `tenant_id` untuk memilih tenant saat login multi-tenant.
- **Registrasi mandiri**: `POST /api/v1/auth/register` — hanya membuat user. **Tidak** membuat mapping tenant. User tanpa mapping dapat login tetapi mendapat role paling rendah (`resident`) **tanpa** scope tenant, sampai Admin RT menetapkannya via `/admin/users`.
- **Profil**: `GET /api/v1/auth/me` (AUTH, wired `AuthUsecase.GetMe` + `AuthHandler.Me` + `authMw(tenantMw(authMux))`).
- **Daftar tenant user**: `GET /api/v1/auth/tenants` — tenant aktif (`status='active'`).
- **Ganti tenant**: `POST /api/v1/auth/switch-tenant` — verifikasi mapping user→tenant di server, menerbitkan JWT baru.
- **Logout**: sisi klien (hapus token + `queryClient.clear()` + hapus cookie `Domain=.openrt.local`). Tidak ada token revocation server-side.

### 1.1 JWT

- Algoritma **HS256** (pin `jwt.WithValidMethods(["HS256"])`).
- Masa berlaku **24 jam**.
- Claims: `user_id`, `tenant_id` (opsional), `role`, `exp`, `iat`, `sub`.
- **Role & tenant scope dari database** (`tenant_users JOIN roles`, hanya `status='active'`). Tidak pernah dari email/input klien.
- Token tanpa `user_id` valid → 401; manipulasi → signature invalid → 401.
- **Hostname tidak pernah mengganti tenant JWT.** Mismatch subdomain tenant vs JWT → 403. Switch hanya via `POST /auth/switch-tenant`.
- Secret: `JWT_SECRET` **wajib** (fail-closed jika kosong/pendek atau nilai publik lama).

### 1.2 Tenant Switching & Host Guard (Frontend)

- **Tenant Aktif switcher** (header, superadmin) + **Masuk Tenant** button.
- Cookie cross-subdomain `Domain=.openrt.local` + `BroadcastChannel` + hard reload untuk sinkron mix-login antar subdomain.
- **Host guard**: `MainLayout` `useEffect` bounce ke hostname tenant yang benar jika JWT tenant ≠ hostname slug; `api` interceptor 403 tenant → clear tenant.
- Superadmin di subdomain tenant tanpa match → 403 (harus switch dulu atau via host platform `localhost`/`app.<base>`).

## 2. Role

Hanya **tiga role**:

| Role (DB) | JWT/frontend | Scope |
|---|---|---|
| `superadmin` | `superadmin` (`SUPER_ADMIN`/`super_admin`) | Platform/global: tenant CRUD, user lintas tenant |
| `admin_rt` | `admin_rt` (`RT_ADMIN`) | Tenant miliknya: seluruh operasional |
| `resident` | `resident` (`RESIDENT`) | Tenant miliknya: read-only + partisipasi (RSVP, aspirasi, reaksi, vote) |

## 3. RBAC — Matriks Otorisasi per Endpoint

Konvensi: **PUBLIC** (tanpa auth), **AUTH** (semua login), **ADMIN** (`superadmin`+`admin_rt`), **SUPERADMIN** (`superadmin`).

| Grup | Endpoint | Metode | Akses |
|---|---|---|---|
| Health | `/health` | GET | PUBLIC |
| Auth | `/auth/login`, `/register` | POST | PUBLIC |
| Auth | `/auth/me`, `/auth/tenants`, `/auth/switch-tenant` | GET/POST | AUTH |
| Public | `/t/resolve` | GET | PUBLIC |
| Public tenant | `/t/{slug}/info`, `/announcements`, `/documents`, `/aspirations`, `/needs`, `/meetings`, `/financial-summary`, `/events`, `/polls/{id}` (+ POST `/aspirations`, POST `/t/{slug}/events` KPI) | GET/POST | PUBLIC |
| Push config | `/push/config` | GET | PUBLIC |
| Superadmin tenants | `/superadmin/tenants` (+ `/{id}`) | GET/POST/PUT/DELETE | SUPERADMIN |
| Users | `/users` (+ `/{id}`) | GET/POST/PUT/DELETE | ADMIN (superadmin global, admin_rt scope tenant; hanya superadmin boleh role `superadmin`) |
| Residents | `/residents` (+ `/{id}`) | GET/POST/PUT/DELETE | ADMIN (list/read juga ADMIN) |
| Residents | `/{id}/approve`, `/reject`, `/family`, `/family/{memberId}` | POST/DELETE | ADMIN |
| Residents | `/residents/upload` | POST | AUTH |
| Financial | `/financial/categories` (+ `/{id}`) | GET/POST/PUT/DELETE | list/read AUTH; write ADMIN |
| Financial | `/financial/funds` (+ `/{id}`) | GET/POST/PUT/DELETE | list/read AUTH; write ADMIN (`is_default` guard) |
| Financial | `/financial/summary` | GET | AUTH |
| Financial | `/financial/dues` | GET/POST | list AUTH (filter `status=pending\|verified\|rejected`); record ADMIN |
| Financial | `/financial/dues/{id}/verify` | POST | ADMIN |
| Financial | `/financial/transactions` (+ `/{id}`) | GET/POST | list AUTH; create ADMIN; **PUT/DELETE → 405** |
| Financial | `/financial/upload` | POST | AUTH |
| Events | `/events` (+ `/{id}`) | GET/POST/PUT/DELETE | list/read AUTH (filter `status`); write ADMIN |
| Events | `/{id}/budget` | GET/POST/PUT | read AUTH; write ADMIN |
| Events | `/{id}/rsvp` | POST | AUTH |
| Events | `/{id}/roles` (+ `/{roleId}`) | GET/POST/DELETE | read AUTH; write ADMIN |
| Events | `/{id}/receipts` | GET/POST | AUTH |
| Events | `/{id}/transparency` | GET | AUTH |
| Events | `/{id}/sponsors` (+ `/{sponsorId}`) | GET/POST/DELETE | read AUTH; write ADMIN |
| Aspirations | `/aspirations` (+ `/{id}`) | GET/PUT | list/read AUTH; update ADMIN |
| Needs | `/needs` (+ `/{id}`) | GET/POST/PUT | list/read AUTH; write ADMIN |
| Announcements | `/announcements` (+ `/{id}`) | GET/POST/PUT/DELETE | read AUTH; write ADMIN (`media_urls` http/https max 10) |
| Documents | `/documents` (+ `/{id}`) | GET/POST/PUT/DELETE | read AUTH; write ADMIN (`PUT` ada) |
| Dashboard | `/dashboard/summary` | GET | AUTH |
| Dashboard | `/dashboard/reports/financial/export?format=csv\|pdf` | GET | AUTH (blob) |
| Meetings | `/meetings` | GET | AUTH (non-admin dipaksa `public`) |
| Meetings | `/meetings` (+ `/{id}`) | POST/PUT/DELETE | ADMIN |
| Meetings | `/{id}/attendees`, `/{id}/decisions` | POST | ADMIN |
| Action Items | `/action-items` (+ `/{id}`) | GET/POST/PUT/DELETE | list AUTH (non-admin hanya public); write ADMIN |
| Reactions | `/reactions` | GET/POST/DELETE | AUTH (1 user 1 reaksi per target) |
| Polls | `/polls` | GET/POST | list AUTH; create ADMIN |
| Polls | `/polls/{id}` | GET/DELETE | read AUTH; close ADMIN |
| Polls | `/polls/{id}/vote` | POST | AUTH (1 user 1 suara, unique constraint) |
| Push | `/push/subscribe`, `/push/unsubscribe` | POST | AUTH (via `api` client; VAPID disabled jika keys kosong) |
| Social | `/social/badge` | GET | AUTH |
| Swagger | `/swagger/`, `/swagger/openapi.yaml` | GET | PUBLIC |

Guard: `RBACMiddleware` untuk `/users`/`/superadmin/tenants`; `RequireAnyRole(superadmin,admin_rt)` di handler write/approve/verify/assign.

## 4. Isolasi Tenant & Otorisasi Resource

Invariant (security_integration_test.go — 7 tests):

- `ADMIN_RT_A` hanya tenant A; cross → deny.
- `SUPERADMIN` global scope eksplisit, tidak otomatis semua op tenant.
- Public sanitasi (tanpa `resident_id`), `media_urls` http/https, dll.

Mekanisme:

1. **Tenant hanya dari JWT claims** — `X-Tenant-ID`/query/`X-Forwarded-Host` tidak pernah dipercaya. Hostname hanya discovery.
2. **Schema-qualified queries** (`TenantTable` → `tenant_<slug>.table`), tanpa `SET search_path`.
3. **Resource-level auth** — resource tenant lain → 404 (tidak bocor) atau 403.
4. **Role escalation prevention** — hanya superadmin boleh `superadmin`; admin_rt dipaksa tenant-nya.
5. **Tenant dihapus/inactive** → JWT mapping invalid → 403/404.
6. **Cache frontend** — `queryClient.clear()` + cookie + BroadcastChannel.
7. **Hostname → DB lookup → match JWT** (`middleware/hostname.go` + `TenantMiddleware`): subdomain `<slug>.<TENANT_BASE_DOMAIN>` di-resolve via `tenants`; harus `active` dan sama dengan JWT. Asing/unknown/inactive/mismatch → 403; public endpoint mismatch → 404.
8. **Meetings visibility** — non-admin dipaksa `public` di list, 403 di detail non-public, action items non-public hidden.
9. **Social isolation** — reaksi/poll_votes unique constraint per user; badge hitung nyata.
10. **NIK crypto** — AES-256-GCM + HMAC; `NIK_ENCRYPTION_KEY` harus 32 byte; dev fallback `0123456789abcdef0123456789abcdef`, **panic di prod jika invalid** (fail-closed); per-tenant prefix MinIO.
11. **Rate-limit per-IP** — 1000/100 default, auth 20/5; `/health`/`/swagger/` exempt; `X-Forwarded-For` hanya dari `TRUSTED_PROXY_IPS` (CIDR).
12. **VAPID** — kosong → push disabled graceful (`BroadcastTenant WithTimeout 5s`).
13. **Upload guard** — 5 MB, hanya JPG/PNG/WebP/PDF → 400.

## 5. Endpoint Publik

Tanpa login: `GET /t/{slug}/info|announcements|documents|aspirations|needs|meetings|financial-summary|events|polls/{id}`, `POST /t/{slug}/aspirations` (anonim, `resident_id` di-null-kan), `POST /t/{slug}/events` KPI, `GET /push/config`, `/t/resolve`, `/health`, `/swagger/*`. Polls publik agregat tanpa `my_vote`; financial-summary agregat tanpa pembayar/funds.

## 6. Konsistensi Frontend

- Role hanya dari JWT; `ProtectedRoute`/`MainLayout` guard; `SUPER_ADMIN|RT_ADMIN` untuk `/admin/users`, `SUPER_ADMIN` untuk `/admin/tenants`.
- Sidebar filter role (UX guard, backend tetap enforce).
- `api` base `/api/v1`, tidak kirim `X-Tenant-ID`; 401 auto logout; `social.ts` fix double prefix, `push.ts` via `api`, dashboard blob, event budget di list, RSVP/RAB toast, Reaction/Poll/Badge error handling.
- `getTenantSlugFromHost` via `VITE_TENANT_BASE_DOMAIN` (harus sama dengan `TENANT_BASE_DOMAIN`).

## 7. Use Case per Role

### Public
Lihat portal publik, submit aspirasi anonim, lihat agenda/meetings publik, hasil poll agregat.

### Resident
Login, switch tenant, dashboard, aspirasi, RSVP, reaksi/vote, badge, lihat transparansi event.

### Admin RT
CRUD warga/family/approve, funds/categories/dues verify, transaksi, events/budget/roles/receipts/sponsors, meetings/attendees/decisions/action-items, aspirasi/needs, announcements (`media_urls`) & documents (`PUT`), polls create/close, users tenant-nya.

### Super Admin
CRUD tenant (provisi/drop schema, `inactive` deny), user global (hanya boleh set `superadmin`), Tenant Aktif switcher + Masuk Tenant, host guard.

## 8. Batasan yang Diketahui

| Level | Item |
|---|---|
| MEDIUM | **Tidak ada token revocation on logout.** JWT valid hingga 24 jam. Rekomendasi: short-lived + refresh/blacklist. |
| MEDIUM | **TLS hanya di proxy produksi.** Dev HTTP; produksi wildcard TLS `*.openrt.com` (DNS-01). |
| LOW | `Login` mapping semua error ke 401 (menyulitkan debug). |
| LOW | `isSuperAdminRole` duplikat di `usecase` & `http`. |

## 9. Pengujian Keamanan

Lihat [testing.md](./testing.md) — 7 security tests (cross-tenant, escalation, RBAC, superadmin protection, public sanitasi, social isolation, meeting visibility) + E2E 64.

## 10. Model Integrasi 3 Entitas (House, Resident, User)

Aplikasi membedakan secara tegas antara **Hunian Fisik**, **Sensus Penduduk**, dan **Kredensial Akses Pengguna**:

| Entitas | Lingkup | Primary Identifier | Catatan Keamanan & Akses |
|---|---|---|---|
| **Rumah (`houses`)** | Fisik Hunian RT | `id (UUID)` / `access_token` | Membawa stiker QR fisik pintu (`1 Rumah = 1 Token`), PIN 4-digit verifikasi, dan tautan Kepala Keluarga (`head_resident_id`). Digunakan untuk hak suara polling (1 Rumah = 1 Suara). |
| **Penduduk (`residents`)** | Sensus Warga RT | `id (UUID)` / `nik_hash` | Data sensus kependudukan riil (NIK dienkripsi AES-256-GCM + HMAC lookup). Menghubungkan kartu keluarga dan mutasi kepala keluarga. Menautkan fisik hunian lewat `house_id`. |
| **Pengguna (`users`)** | IAM / Akun Login | `id (UUID)` / `email` | Kredensial login web portal (`email` + `password_hash`). Terikat ke tenant via `tenant_users`. |

### Alur Sinkronisasi & Pembuatan Akun
1. **Zero-Friction Scan QR Pintu:**
   - Warga scan stiker QR pintu (`/claim?token=...`).
   - Sistem auto-generate akun warga jika belum ada (`rumah-<slug>-<blok>@warga.local`).
   - Terbit JWT warga langsung tanpa input password.
2. **Pembuatan Akun Manual oleh Pengurus (`/admin/users`):**
   - Form pembuatan user menyediakan `SearchableResidentSelect` di header dialog.
   - Memilih warga terdaftar otomatis mengisi *Nama Lengkap*, *Nomor HP/WA*, dan rekomendasi email warga.
3. **Integritas Penghapusan (ON DELETE SET NULL):**
   - **Hapus Rumah:** Rumah di-soft-delete, stiker dinonaktifkan. Data sensus warga tetap aman (`resident.house_id` menjadi `NULL`).
   - **Hapus Penduduk:** Penduduk di-soft-delete. Rumah fisik tetap berdiri (`house.head_resident_id` menjadi `NULL`) dan stiker QR tetap bisa dipakai penghuni baru.
   - **Hapus Pengguna:** Akses login dicabut. Sensus NIK/KK dan rumah fisik tidak terganggu.
