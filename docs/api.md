# API Reference — Sitransparan RT/RW

Daftar endpoint **aktual** dari registrasi route di `backend/cmd/server/main.go` dan masing-masing handler. OpenAPI spec yang diserve tersedia di `GET /swagger/openapi.yaml` (file: `backend/internal/delivery/http/openapi.yaml`).

- **Base URL**: `http://localhost:8081/api/v1` (production bisa via reverse proxy).
- **Autentikasi**: `Authorization: Bearer <jwt>`.
- **Format**: JSON (`application/json`), kecuali upload (multipart/form-data) dan export (file).
- **Role**: `PUBLIC` (tanpa auth), `AUTH` (semua role login), `ADMIN` (`superadmin`+`admin_rt`), `SUPERADMIN` (`superadmin`).

---

## 1. Public Endpoints (tanpa autentikasi)

### Health

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/health` | Health check |

### Auth — Public

| Metode | Path | Keterangan |
|---|---|---|
| POST | `/api/v1/auth/login` | Login. Body: `{email, password, tenant_id?}`. Response: `{token, user:{id,email,name,phone?,role,...}}`. 401 jika kredensial salah. |
| POST | `/api/v1/auth/register` | Registrasi user baru. Body: `{name, email, password, phone?}`. **Tidak** membuat mapping tenant. |

### Public Tenant Resources (resolusi tenant via slug di path)

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/t/{slug}/info` | Info tenant publik (id, name, slug, domain, logo_url). Response: `{data: tenant}`. |
| GET | `/api/v1/t/{slug}/announcements` | List pengumuman publik. Query: `limit`, `offset`. |
| GET | `/api/v1/t/{slug}/documents` | List dokumen publik. Query: `limit`, `offset`. |
| GET | `/api/v1/t/{slug}/aspirations` | List aspirasi publik (tanpa identitas resident). |
| POST | `/api/v1/t/{slug}/aspirations` | Submit aspirasi publik anonim (`resident_id` diabaikan). |
| GET | `/api/v1/t/{slug}/needs` | List kebutuhan lingkungan publik. |

### Swagger

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/swagger/` , `/swagger` | Swagger UI |
| GET | `/swagger/openapi.yaml` | OpenAPI spec (YAML) |

---

## 2. Auth — Authenticated

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/auth/tenants` | AUTH | Daftar tenant aktif milik user (mapping `status='active'`). |
| POST | `/api/v1/auth/switch-tenant` | AUTH | Ganti tenant aktif. Body: `{tenant_id}`. Server memverifikasi mapping → JWT baru. |

---

## 3. SuperAdmin — Tenant Management

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/superadmin/tenants` | SUPERADMIN | List tenant. Query: `limit`, `offset`. Response: `{tenants, total}`. |
| POST | `/api/v1/superadmin/tenants` | SUPERADMIN | Buat tenant. Body: `{name, slug, domain?, logo_url?}`. Schema `tenant_<slug>` dibuat otomatis. Domain default: `<slug>.<TENANT_BASE_DOMAIN>` (mis. `rt-003.openrt.local`). |
| GET | `/api/v1/superadmin/tenants/{id}` | SUPERADMIN | Detail tenant. |
| PUT | `/api/v1/superadmin/tenants/{id}` | SUPERADMIN | Update tenant (name, slug, domain, logo_url). |
| DELETE | `/api/v1/superadmin/tenants/{id}` | SUPERADMIN | Hapus tenant **beserta schema `tenant_<slug>`** (`DROP SCHEMA ... CASCADE`). Response 204. |

---

## 4. Users

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/users` | ADMIN | List user. Superadmin: seluruh tenant (global); admin_rt: user tenant-nya. Query: `limit`, `offset`. |
| POST | `/api/v1/users` | ADMIN | Buat user. Body: `{name, email, password, phone?, role, tenant_id?}`. Hanya superadmin dapat membuat role `superadmin` (role escalation → 403). |
| GET | `/api/v1/users/{id}` | ADMIN | Detail user. |
| PUT | `/api/v1/users/{id}` | ADMIN | Update user (name, email, phone, role, password?). |
| DELETE | `/api/v1/users/{id}` | ADMIN | Hapus user. |

---

## 5. Residents (Pendataan Warga)

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/residents` | ADMIN | List warga. Query: `q`, `limit`, `offset`. Response: `{data, total, limit, offset}`. |
| POST | `/api/v1/residents` | ADMIN | Buat warga. NIK dienkripsi (AES-256-GCM) + disimpan hash HMAC untuk pencarian. |
| GET | `/api/v1/residents/{id}` | ADMIN | Detail warga. |
| PUT | `/api/v1/residents/{id}` | ADMIN | Update warga. |
| DELETE | `/api/v1/residents/{id}` | ADMIN | Hapus warga. |
| POST | `/api/v1/residents/{id}/approve` | ADMIN | Approve warga (status → approved). |
| POST | `/api/v1/residents/{id}/reject` | ADMIN | Reject warga. |
| POST | `/api/v1/residents/{id}/family` | ADMIN | Tambah anggota keluarga. |
| DELETE | `/api/v1/residents/{id}/family/{memberId}` | ADMIN | Hapus anggota keluarga. |
| POST | `/api/v1/residents/upload` | AUTH | Upload file (KTP/KK/dokumen). Multipart: `file`, `type`. Response: `{file_url, type}`. |

---

## 6. Financial (Keuangan & Iuran)

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/financial/categories` | AUTH | List kategori iuran. |
| POST | `/api/v1/financial/categories` | ADMIN | Buat kategori iuran. |
| GET | `/api/v1/financial/categories/{id}` | AUTH | Detail kategori. |
| PUT | `/api/v1/financial/categories/{id}` | ADMIN | Update kategori. |
| DELETE | `/api/v1/financial/categories/{id}` | ADMIN | Hapus kategori. |
| GET | `/api/v1/financial/summary` | AUTH | Ringkasan kas: `{total_income, total_expense, balance, ...}`. |
| GET | `/api/v1/financial/dues` | AUTH | List pembayaran iuran. Query: `resident_id`, `limit`, `offset`. |
| POST | `/api/v1/financial/dues` | ADMIN | Catat pembayaran iuran. |
| POST | `/api/v1/financial/dues/{id}/verify` | ADMIN | Verifikasi iuran. Body: `{status: "verified"\|"rejected"}`. |
| GET | `/api/v1/financial/transactions` | AUTH | List transaksi kas. Query: `type` (`income`/`expense`), `limit`, `offset`. |
| POST | `/api/v1/financial/transactions` | ADMIN | Catat transaksi kas. |
| GET | `/api/v1/financial/transactions/{id}` | AUTH | Detail transaksi. |
| PUT | `/api/v1/financial/transactions/{id}` | — | **405** — ledger append-only (koreksi via reversing entry). |
| DELETE | `/api/v1/financial/transactions/{id}` | — | **405** — deletion disabled. |
| POST | `/api/v1/financial/upload` | AUTH | Upload bukti transfer. Multipart: `file`. Response: `{proof_url}`. |

---

## 7. Events (Kegiatan & Budget)

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/events` | AUTH | List kegiatan. Query: `limit`, `offset`. |
| POST | `/api/v1/events` | ADMIN | Buat kegiatan. |
| GET | `/api/v1/events/{id}` | AUTH | Detail kegiatan. |
| PUT | `/api/v1/events/{id}` | ADMIN | Update kegiatan. |
| DELETE | `/api/v1/events/{id}` | ADMIN | Hapus kegiatan. |
| GET | `/api/v1/events/{id}/budget` | AUTH | List RAB/budget kegiatan. |
| POST | `/api/v1/events/{id}/budget` | ADMIN | Tambah/update item budget. |
| PUT | `/api/v1/events/{id}/budget` | ADMIN | Alias update item budget. |
| POST | `/api/v1/events/{id}/rsvp` | AUTH | RSVP warga. Body: `{status: attending\|absent\|maybe, ...}`. |
| GET | `/api/v1/events/{id}/roles` | AUTH | List panitia (event roles). |
| POST | `/api/v1/events/{id}/roles` | ADMIN | Assign panitia. Body: `{resident_id, role}`. |
| DELETE | `/api/v1/events/{id}/roles/{roleId}` | ADMIN | Hapus penugasan panitia. |
| GET | `/api/v1/events/{id}/receipts` | AUTH | List kuitansi/donasi. |
| POST | `/api/v1/events/{id}/receipts` | AUTH | Upload kuitansi (multipart `file` + `resident_id?`, `amount`, `description`; atau JSON `file_content` base64). |
| GET | `/api/v1/events/{id}/transparency` | AUTH | Data transparansi kegiatan (ringkasan budget, partisipasi, donasi). |
| GET | `/api/v1/events/{id}/sponsors` | AUTH | List sponsor. |
| POST | `/api/v1/events/{id}/sponsors` | ADMIN | Tambah sponsor. Body: `{name, amount, type: cash\|goods\|service, notes?}`. |
| DELETE | `/api/v1/events/{id}/sponsors/{sponsorId}` | ADMIN | Hapus sponsor. |

---

## 8. Aspirations & Needs

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/aspirations` | AUTH | List aspirasi (internal). |
| GET | `/api/v1/aspirations/{id}` | AUTH | Detail aspirasi. |
| PUT | `/api/v1/aspirations/{id}` | ADMIN | Update status & respons. Body: `{status, response?}`. |
| GET | `/api/v1/needs` | AUTH | List kebutuhan lingkungan. |
| POST | `/api/v1/needs` | ADMIN | Buat kebutuhan. |
| GET | `/api/v1/needs/{id}` | AUTH | Detail kebutuhan. |
| PUT | `/api/v1/needs/{id}` | ADMIN | Update kebutuhan. |

---

## 9. Announcements & Documents

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/announcements` | AUTH | List pengumuman. |
| POST | `/api/v1/announcements` | ADMIN | Terbitkan pengumuman. |
| GET | `/api/v1/announcements/{id}` | AUTH | Detail pengumuman. |
| PUT | `/api/v1/announcements/{id}` | ADMIN | Update pengumuman. |
| DELETE | `/api/v1/announcements/{id}` | ADMIN | Hapus pengumuman. |
| GET | `/api/v1/documents` | AUTH | List dokumen. |
| POST | `/api/v1/documents` | ADMIN | Upload/buat dokumen. |
| GET | `/api/v1/documents/{id}` | AUTH | Detail dokumen. |
| DELETE | `/api/v1/documents/{id}` | ADMIN | Hapus dokumen. |

---

## 10. Dashboard & Laporan

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/dashboard/summary` | AUTH | Ringkasan dashboard: `{total_residents, total_income, total_expense, balance, total_events, new_aspirations_count}`. |
| GET | `/api/v1/dashboard/reports/financial/export` | AUTH | Export laporan keuangan. Query: `format=csv\|pdf` (default csv), `start_date=YYYY-MM-DD`, `end_date=YYYY-MM-DD`. Response: file attachment. |

---

## 11. Konvensi Error

- `401` — token hilang/rusak/kadaluwarsa/manipulasi.
- `403` — role tidak diizinkan / tenant access denied / role escalation.
- `404` — resource tidak ditemukan (termasuk resource tenant lain — tidak membocorkan eksistensi).
- `400` — payload tidak valid.
- `405` — method tidak diizinkan (contoh: update/delete transaksi keuangan).
- Response error: `{"error": "<pesan>"}`.
