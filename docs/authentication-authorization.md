# Autentikasi & Otorisasi — Sitransparan RT/RW

Dokumen ini menggambarkan model autentikasi, JWT, RBAC, isolasi tenant, dan otorisasi resource **aktual** sesuai implementasi backend (`backend/internal/usecase/auth_usecase.go`, `backend/internal/delivery/http/middleware/`, `backend/internal/usecase/user_usecase.go`) dan frontend.

---

## 1. Autentikasi

- **Login**: `POST /api/v1/auth/login` (email + password, bcrypt). Mengembalikan JWT dan data user.
- **Registrasi mandiri**: `POST /api/v1/auth/register` — hanya membuat user. **Tidak** membuat mapping tenant. User tanpa mapping dapat login tetapi mendapat role paling rendah (`resident`) **tanpa** scope tenant, sampai Admin RT menetapkannya ke tenant via halaman `/users`.
- **Daftar tenant user**: `GET /api/v1/auth/tenants` — tenant yang user-nya aktif (mapping `status='active'`).
- **Ganti tenant**: `POST /api/v1/auth/switch-tenant` — memverifikasi mapping user→tenant di server, menerbitkan JWT baru yang ter-scope ke tenant tersebut.
- **Logout**: sisi klien (hapus token dari localStorage + `queryClient.clear()`). Tidak ada mekanisme server-side token revocation.

### 1.1 JWT

- Algoritma **HS256** (dipin-kan dengan `jwt.WithValidMethods(["HS256"])` — mencegah algorithm confusion).
- Masa berlaku **24 jam** (default, `jwtDuration`).
- Claims: `user_id`, `tenant_id` (opsional), `role`, `exp`, `iat`, `sub`.
- **Role & tenant scope berasal dari database** (`tenant_users JOIN roles`), hanya mapping `status='active'`. Tidak pernah diturunkan dari email atau input klien.
- Token tanpa `user_id` valid → ditolak (401).
- Manipulasi role/tenant/user_id pada JWT → signature invalid → 401.
- **Hostname tidak pernah mengganti tenant JWT.** Jika request datang di subdomain tenant (`rt-003.<base>`), tenant JWT harus sama dengan tenant hostname; mismatch → 403. Tenant-switching hanya lewat `POST /api/v1/auth/switch-tenant` (server-verified).

## 2. Role

Hanya **tiga role** yang ada di source code, migrasi `000001`, dan frontend:

| Role (DB) | Nama di JWT/frontend | Scope |
|---|---|---|
| `superadmin` | `superadmin` (frontend juga menerima `SUPER_ADMIN`/`super_admin`) | Platform/global: manajemen tenant, manajemen user lintas tenant |
| `admin_rt` | `admin_rt` (`RT_ADMIN`) | Tenant miliknya: seluruh operasional tenant |
| `resident` | `resident` (`RESIDENT`) | Tenant miliknya: read-only + partisipasi (RSVP, aspirasi) |

## 3. RBAC — Matriks Otorisasi per Endpoint

Konvensi:

- **PUBLIC** — tanpa autentikasi.
- **AUTH** — semua role terautentikasi (termasuk resident).
- **ADMIN** — `superadmin` + `admin_rt`.
- **SUPERADMIN** — `superadmin` saja.

| Grup | Endpoint | Metode | Akses |
|---|---|---|---|
| Health | `/api/v1/health` | GET | PUBLIC |
| Auth | `/api/v1/auth/login`, `/register` | POST | PUBLIC |
| Auth | `/api/v1/auth/tenants`, `/switch-tenant` | GET/POST | AUTH |
| Tenant info | `/api/v1/t/{slug}/info` | GET | PUBLIC |
| Superadmin tenants | `/api/v1/superadmin/tenants` (+ `/{id}`) | GET/POST/PUT/DELETE | SUPERADMIN |
| Users | `/api/v1/users` (+ `/{id}`) | GET/POST/PUT/DELETE | ADMIN (superadmin scope global, admin_rt scope tenant-nya; hanya superadmin yang bisa membuat/mengubah role `superadmin`) |
| Residents | `/api/v1/residents` (+ `/{id}`) | GET/POST/PUT/DELETE | ADMIN untuk list/create/update/delete; read by-id juga ADMIN |
| Residents | `/api/v1/residents/{id}/approve`, `/reject`, `/family`, `/family/{memberId}` | POST/DELETE | ADMIN |
| Residents | `/api/v1/residents/upload` | POST | AUTH (upload file KTP/KK/dokumen) |
| Financial | `/api/v1/financial/categories` (+ `/{id}`) | GET/POST/PUT/DELETE | list/read AUTH; create/update/delete ADMIN |
| Financial | `/api/v1/financial/summary` | GET | AUTH |
| Financial | `/api/v1/financial/dues` | GET/POST | list AUTH; record ADMIN |
| Financial | `/api/v1/financial/dues/{id}/verify` | POST | ADMIN |
| Financial | `/api/v1/financial/transactions` (+ `/{id}`) | GET/POST | list AUTH; create ADMIN; **PUT/DELETE → 405** (append-only ledger) |
| Financial | `/api/v1/financial/upload` | POST | AUTH |
| Events | `/api/v1/events` (+ `/{id}`) | GET/POST/PUT/DELETE | list/read AUTH; create/update/delete ADMIN |
| Events | `/api/v1/events/{id}/budget` | GET/POST/PUT | read AUTH; write ADMIN |
| Events | `/api/v1/events/{id}/rsvp` | POST | AUTH (warga) |
| Events | `/api/v1/events/{id}/roles` (+ `/{roleId}`) | GET/POST/DELETE | read AUTH; assign/remove ADMIN |
| Events | `/api/v1/events/{id}/receipts` | GET/POST | read AUTH; upload AUTH |
| Events | `/api/v1/events/{id}/transparency` | GET | AUTH |
| Events | `/api/v1/events/{id}/sponsors` (+ `/{sponsorId}`) | GET/POST/DELETE | read AUTH; create/delete ADMIN |
| Aspirations | `/api/v1/aspirations` (+ `/{id}`) | GET/PUT | list/read AUTH; update status/response ADMIN |
| Needs | `/api/v1/needs` (+ `/{id}`) | GET/POST/PUT | list/read AUTH; create/update ADMIN |
| Announcements | `/api/v1/announcements` (+ `/{id}`) | GET/POST/PUT/DELETE | read AUTH; write ADMIN |
| Documents | `/api/v1/documents` (+ `/{id}`) | GET/POST/PUT/DELETE | read AUTH; write ADMIN |
| Dashboard | `/api/v1/dashboard/summary` | GET | AUTH |
| Dashboard | `/api/v1/dashboard/reports/financial/export` | GET | AUTH |
| Public tenant | `/api/v1/t/{slug}/announcements`, `/documents`, `/aspirations`, `/needs` | GET (POST untuk submit aspirasi publik) | PUBLIC |
| Swagger | `/swagger/`, `/swagger/openapi.yaml` | GET | PUBLIC |

Implementasi guard:

- Middleware: `RBACMiddleware(RoleSuperAdmin, RoleAdminRT)` untuk `/api/v1/users`; `RBACMiddleware(RoleSuperAdmin)` untuk `/api/v1/superadmin/tenants`.
- Handler: helper `middleware.RequireAnyRole(r, RoleSuperAdmin, RoleAdminRT)` pada seluruh operasi write/approve/verify/assign di resident, financial, event, aspiration_need, announcement_doc.
- Ops read umumnya AUTH (semua role), kecuali daftar/detail resident yang dibatasi ADMIN.

## 4. Isolasi Tenant & Otorisasi Resource

Invariant (dibuktikan oleh `backend/internal/delivery/http/security_integration_test.go`):

- `ADMIN_RT_A` hanya dapat mengakses data tenant A; akses ke tenant B/C → **ditolak**.
- `WARGA_A` hanya mengikuti policy tenant A; tenant B/C → ditolak.
- `SUPERADMIN` beroperasi pada scope global/platform yang didefinisikan eksplisit (tenant CRUD, user global); **tidak otomatis** mendapat semua operasi tenant.

Mekanisme:

1. **Tenant hanya dari JWT claims** — `X-Tenant-ID` header, query param, dan `X-Forwarded-Host` tidak pernah dipercaya (cegah tenant escalation). Hostname digunakan **hanya untuk discovery** (lihat poin 7): subdomain tenant di-lookup ke DB dan **harus cocok dengan tenant JWT**, jika tidak → 403.
2. **Schema-qualified queries** — semua query tenant menggunakan `TenantTable(ctx, table)` → `tenant_<slug>.table`. Tidak ada `SET search_path` pada request path (cegah kebocoran antar koneksi connection pool).
3. **Resource-level authorization** — resource diambil/dimutasi dengan `tenantID` dari konteks; resource milik tenant lain → `404` (tidak membocorkan eksistensi) atau ditolak.
4. **Role escalation prevention** (`usecase/user_usecase.go`) — hanya superadmin yang dapat membuat/men-set role `superadmin`; admin_rt dipaksa ke tenant-nya sendiri; akun superadmin dilindungi dari admin tenant.
5. **Tenant dihapus** → mapping claims tidak valid → `TenantMiddleware` deny eksplisit `403`.
6. **Cache frontend** — `queryClient.clear()` pada login/logout/switch tenant mencegah data tenant lama tampil di tenant baru.
7. **Hostname tenant → DB lookup → match JWT** (`middleware/hostname.go` + `TenantMiddleware`): subdomain `<slug>.<TENANT_BASE_DOMAIN>` di-resolve via tabel `tenants`; tenant harus **exist + `status='active'`** dan sama dengan tenant JWT. Hostname asing / tenant tidak dikenal / tenant `inactive` / mismatch JWT → **403**; endpoint publik dengan hostname yang menunjuk tenant berbeda → 404. Wildcard DNS (`*.openrt.com`) hanyalah routing — ia **bukan** otorisasi.

## 5. Endpoint Publik

Endpoint publik boleh diakses tanpa login dan dibatasi pada:

- Info tenant per slug (`GET /api/v1/t/{slug}/info`).
- List pengumuman & dokumen publik (`/announcements`, `/documents`).
- List aspirasi & kebutuhan (`/aspirations`, `/needs`) + **submit aspirasi publik** (`POST /api/v1/t/{slug}/aspirations`).

Sanitasi: submit publik **tidak** menerima `resident_id` (selalu di-null-kan); list publik tidak mengekspos identitas resident.

## 6. Konsistensi Frontend

- Role hanya dari JWT (`frontend/src/types/auth.ts`, `ProtectedRoute.tsx`, `MainLayout.tsx`); tidak ada deteksi role via email.
- Halaman `/users` hanya untuk `SUPER_ADMIN`/`RT_ADMIN`; `/superadmin/tenants` hanya `SUPER_ADMIN`.
- Navigasi sidebar menyembunyikan halaman admin dari resident (lapisan UX — otorisasi sebenarnya tetap di backend).
- API client tidak mengirim `X-Tenant-ID`; 401 → auto logout.

## 7. Use Case per Role

### Public (tanpa login)
- Lihat pengumuman & dokumen publik, aspirasi & kebutuhan, agenda kegiatan publik.
- Mengirim aspirasi secara anonim.

### Resident (Warga RT)
- Login, memilih/ganti tenant (bila terdaftar di lebih dari satu tenant).
- Melihat dashboard (ringkasan kas, iuran, kegiatan, pengumuman).
- Mengirim aspirasi; RSVP kegiatan; melihat detail kegiatan/anggaran/transparansi.
- **Tidak dapat** membuat/mengubah/menghapus data admin (403 dari backend).

### Admin RT (Pengurus RT)
- CRUD user di tenant-nya (tidak bisa menyentuh role superadmin).
- CRUD warga + anggota keluarga + approve/reject warga.
- Kelola iuran (catat & verifikasi), transaksi kas, kategori iuran.
- Kelola kegiatan, RAB/budget, panitia, sponsor.
- Kelola aspirasi (ubah status + respons) dan kebutuhan lingkungan.
- Terbitkan pengumuman & kelola dokumen.

### Super Admin (Pengelola Platform)
- CRUD tenant (membuat tenant otomatis memprovisikan schema `tenant_<slug>`; menghapus tenant menghapus schema; `status=inactive` menonaktifkan tenant di semua boundary).
- Manajemen user lintas tenant (scope global); satu-satunya role yang bisa membuat/men-set role superadmin.
- **Superadmin di subdomain tenant**: JWT superadmin ter-scope ke tenant mapping-nya (mis. `sitransparan-rt`). Mengunjungi `rt-003.<base>` tanpa switch tenant → 403 (hostname ≠ JWT tenant), sesuai model keamanan. Untuk mengelola data tenant tertentu lewat subdomain tenant, superadmin harus switch tenant dulu (`/auth/switch-tenant`) — atau mengakses lewat host platform (`localhost` / `app.<base>`) di mana tenant berasal dari JWT.

## 8. Batasan yang Diketahui

| Level | Item |
|---|---|
| MEDIUM | **Tidak ada token revocation on logout.** JWT yang dicuri tetap valid hingga kedaluwarsa (24 jam). Rekomendasi: JWT short-lived + refresh token/blacklist. |
| MEDIUM | **TLS hanya di lapisan proxy produksi.** Dev memakai HTTP; produksi harus mengonfigurasi wildcard TLS (lihat deployment.md). |
| LOW | `AuthHandler.Login` memetakan semua error (termasuk DB error) ke 401 — bukan risiko keamanan, hanya menyulitkan debugging. |
| LOW | Helper `isSuperAdminRole` terduplikasi di package `usecase` dan `http`. |
| UNTESTED | MinIO masih **stub** (`type Client struct{}`, tidak pernah dipakai): upload menerima file lalu membuang isinya — hanya URL fiktif yang disimpan dan tidak diserve (404). Bukan risiko confidentiality, tapi fitur upload **belum fungsional** (lihat `docs/api.md` §12). |

## 9. Pengujian Keamanan

Lihat [testing.md](./testing.md) untuk daftar test keamanan (`TestSecurity_*`) dan hasil verifikasi E2E.
