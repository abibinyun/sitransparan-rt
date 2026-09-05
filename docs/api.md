# API Reference — Sitransparan RT/RW

Daftar endpoint **aktual** dari registrasi route di `backend/cmd/server/main.go` dan masing-masing handler. OpenAPI spec diserve di `GET /swagger/openapi.yaml` (file: `backend/internal/delivery/http/openapi.yaml`, 54KB).

- **Base URL**: `http://localhost:8081/api/v1` (produksi via reverse proxy).
- **Autentikasi**: `Authorization: Bearer <jwt>`.
- **Format**: JSON (`application/json`), kecuali upload (multipart/form-data) dan export (blob file).
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
| POST | `/api/v1/auth/login` | Login. Body: `{email, password, tenant_id?}`. Response: `{token, user}`. 401 jika kredensial salah. |
| POST | `/api/v1/auth/register` | Registrasi user baru. Body: `{name, email, password, phone?}`. **Tidak** membuat mapping tenant. |

### Public Tenant Resources (resolusi tenant via slug di path)

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/t/resolve` | Resolusi hostname/custom domain ke slug tenant aktif. Query: `host={domain}`. Response: `{"slug":"..."}`. |
| GET | `/api/v1/t/{slug}/info` | Info tenant publik (id, name, slug, domain, logo_url). |
| GET | `/api/v1/t/{slug}/announcements` | List pengumuman publik. Query: `limit`, `offset`. |
| GET | `/api/v1/t/{slug}/documents` | List dokumen publik. |
| GET | `/api/v1/t/{slug}/aspirations` | List aspirasi publik (tanpa identitas resident). |
| POST | `/api/v1/t/{slug}/aspirations` | Submit aspirasi publik anonim (`resident_id` diabaikan). |
| GET | `/api/v1/t/{slug}/needs` | List kebutuhan lingkungan publik. |
| GET | `/api/v1/t/{slug}/meetings` | Notulen rapat **publik saja** (tanpa notes internal & `created_by`). Hostname mismatch → 404. |
| GET | `/api/v1/t/{slug}/financial-summary` | Ringkasan kas **agregat** (`current_balance`, `monthly_income`, `monthly_expense`, `spending_breakdown`, `funds`). |
| GET | `/api/v1/t/{slug}/financial/categories` | Kategori pos iuran dengan agregasi saldo & penyaluran publik (`collected`, `spent`, `balance`). |
| GET | `/api/v1/t/{slug}/financial/transactions` | Riwayat mutasi buku kas terbuka (filter `fund_id`, `category`). Bukti & user ID tidak diekspos. |
| GET | `/api/v1/t/{slug}/events` | List agenda mendatang (20 terbaru, sorted). |
| POST | `/api/v1/t/{slug}/events` | KPI portal `feed_view` / `share_opened` (rate-limited). Body: `{event_type, target_id?}`. |
| GET | `/api/v1/t/{slug}/polls` | Daftar polling terbuka untuk portal publik (hasil **agregat**, tanpa voter identity). |
| GET | `/api/v1/t/{slug}/polls/{id}` | Hasil **agregat** polling untuk portal publik (tanpa `my_vote`). |
| GET | `/api/v1/t/{slug}/karang-taruna` | Struktur pengurus Karang Taruna & periode aktif publik. |
| GET | `/api/v1/t/{slug}/waste-bank/summary` | Ringkasan metrik publik Bank Sampah (total kg, tabungan warga, kas pemuda). |
| GET | `/api/v1/t/{slug}/waste-bank/categories` | Daftar master harga & kategori sampah aktif publik. |
| GET | `/api/v1/t/{slug}/waste-bank/households` | Rekapitulasi tabungan dan partisipasi per KK publik. |

### Push Config (public)

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/push/config` | Status Web Push + `public_key` VAPID. `{enabled, public_key}`. |

### Swagger

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/swagger/` , `/swagger` | Swagger UI |
| GET | `/swagger/openapi.yaml` | OpenAPI spec (YAML) |

---

## 2. Auth — Authenticated

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/auth/me` | AUTH | Profil user saat ini + role + tenant. `{user:{id,name,email,phone,role,tenant_id}, role, tenant_id, tenants}`. |
| GET | `/api/v1/auth/tenants` | AUTH | Daftar tenant aktif milik user (`status='active'`). |
| POST | `/api/v1/auth/switch-tenant` | AUTH | Ganti tenant aktif. Body: `{tenant_id}`. Server verifikasi mapping → JWT baru. |

---

## 3. SuperAdmin — Tenant Management

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/superadmin/tenants` | SUPERADMIN | List tenant. Query: `limit`, `offset`. Default `limit`=500. |
| POST | `/api/v1/superadmin/tenants` | SUPERADMIN | Buat tenant. Body: `{name, slug, domain?, logo_url?}`. Schema `tenant_<slug>` dibuat otomatis. Domain default: `<slug>.<TENANT_BASE_DOMAIN>`. |
| GET | `/api/v1/superadmin/tenants/{id}` | SUPERADMIN | Detail tenant. |
| PUT | `/api/v1/superadmin/tenants/{id}` | SUPERADMIN | Update tenant. |
| DELETE | `/api/v1/superadmin/tenants/{id}` | SUPERADMIN | Hapus tenant **beserta schema `tenant_<slug>`** (`DROP SCHEMA CASCADE`). 204. |

---

## 4. Users

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/users` | ADMIN | List user. Superadmin global; admin_rt scope tenant-nya. Query: `limit`, `offset`. |
| POST | `/api/v1/users` | ADMIN | Buat user. Body: `{name, email, password, phone?, role, tenant_id?}`. Hanya superadmin boleh role `superadmin` (→403). |
| GET | `/api/v1/users/{id}` | ADMIN | Detail user. |
| PUT | `/api/v1/users/{id}` | ADMIN | Update user (name, email, phone, role, password?). |
| DELETE | `/api/v1/users/{id}` | ADMIN | Hapus user. |

---

## 5. Residents (Pendataan Warga)

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/residents` | ADMIN | List warga. Query: `q`, `is_head_of_family=true\|false`, `limit`, `offset`. Tiap item sertakan `family_members`. |
| POST | `/api/v1/residents` | ADMIN | Buat warga. NIK dienkripsi AES-256-GCM + HMAC. |
| GET | `/api/v1/residents/{id}` | ADMIN | Detail warga. |
| PUT | `/api/v1/residents/{id}` | ADMIN | Update warga. |
| DELETE | `/api/v1/residents/{id}` | ADMIN | Hapus warga. |
| POST | `/api/v1/residents/{id}/approve` | ADMIN | Approve warga. |
| POST | `/api/v1/residents/{id}/reject` | ADMIN | Reject warga. |
| POST | `/api/v1/residents/{id}/family` | ADMIN | Tambah anggota keluarga. |
| DELETE | `/api/v1/residents/{id}/family/{memberId}` | ADMIN | Hapus anggota keluarga. |
| POST | `/api/v1/residents/upload` | AUTH | Upload file KTP/KK. Multipart: `file`, `type`. Response: `{file_url, type}`. |

---

## 6. Financial (Keuangan & Iuran)

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/financial/funds` | AUTH | List kantong kas (multi-fund). |
| POST | `/api/v1/financial/funds` | ADMIN | Buat kantong kas. Body: `{name, type: operational\|social\|youth\|infrastructure\|other, description?, is_default?}`. `is_default` unik per tenant (guard). |
| GET | `/api/v1/financial/funds/{id}` | AUTH | Detail kantong kas. |
| PUT | `/api/v1/financial/funds/{id}` | ADMIN | Update kantong kas. |
| DELETE | `/api/v1/financial/funds/{id}` | ADMIN | Hapus kantong kas (default fund tidak boleh dihapus jika masih dipakai). |
| GET | `/api/v1/financial/categories` | AUTH | List kategori iuran. |
| POST | `/api/v1/financial/categories` | ADMIN | Buat kategori. Body: `{name, amount, period: monthly\|one_time, description?}`. |
| GET | `/api/v1/financial/categories/{id}` | AUTH | Detail kategori. |
| PUT | `/api/v1/financial/categories/{id}` | ADMIN | Update kategori. |
| DELETE | `/api/v1/financial/categories/{id}` | ADMIN | Hapus kategori. |
| GET | `/api/v1/financial/summary` | AUTH | Ringkasan kas: `{current_balance, monthly_income, monthly_expense, spending_breakdown}`. |
| GET | `/api/v1/financial/dues` | AUTH | List iuran. Query: `resident_id`, `status=pending\|verified\|rejected`, `limit`, `offset`. Menyertakan `resident_name` & `fee_category_name` (LEFT JOIN). |
| POST | `/api/v1/financial/dues` | ADMIN | Catat pembayaran iuran. |
| POST | `/api/v1/financial/dues/{id}/verify` | ADMIN | Verifikasi. Body: `{status: "verified"\|"rejected"}`. |
| GET | `/api/v1/financial/transactions` | AUTH | List transaksi. Query: `type=income\|expense`, `limit`, `offset`. |
| POST | `/api/v1/financial/transactions` | ADMIN | Catat transaksi. Body opsional `fund_id` + `proof_url`. |
| GET | `/api/v1/financial/transactions/{id}` | AUTH | Detail transaksi. |
| PUT | `/api/v1/financial/transactions/{id}` | — | **405** append-only. |
| DELETE | `/api/v1/financial/transactions/{id}` | — | **405** deletion disabled. |
| POST | `/api/v1/financial/upload` | AUTH | Upload bukti. Multipart: `file`. Response: `{proof_url}`. |

> Funds schema: `type` enum `operational|social|youth|infrastructure|other`, `is_default` boolean (hanya satu default per tenant, guard di usecase). Tidak ada kolom `target_amount` (sudah diganti `type`).

---

## 7. Events (Kegiatan & Budget)

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/events` | AUTH | List kegiatan. Query: `limit`, `offset`, `status=planned\|ongoing\|completed\|cancelled`. Tiap item + `budget{description,estimated_cost,actual_cost}`. |
| POST | `/api/v1/events` | ADMIN | Buat kegiatan. |
| GET | `/api/v1/events/{id}` | AUTH | Detail kegiatan. |
| PUT | `/api/v1/events/{id}` | ADMIN | Update kegiatan. |
| DELETE | `/api/v1/events/{id}` | ADMIN | Hapus kegiatan. |
| GET | `/api/v1/events/{id}/budget` | AUTH | List RAB/budget. |
| POST | `/api/v1/events/{id}/budget` | ADMIN | Tambah/update item budget. Body: `{description, estimated_cost?, actual_cost?}`. |
| PUT | `/api/v1/events/{id}/budget` | ADMIN | Alias update budget. |
| POST | `/api/v1/events/{id}/rsvp` | AUTH | RSVP. Body: `{resident_id, status: attending\|absent\|maybe}`. |
| GET | `/api/v1/events/{id}/roles` | AUTH | List panitia. |
| POST | `/api/v1/events/{id}/roles` | ADMIN | Assign panitia. Body: `{resident_id, role}`. |
| DELETE | `/api/v1/events/{id}/roles/{roleId}` | ADMIN | Hapus panitia. |
| GET | `/api/v1/events/{id}/receipts` | AUTH | List kuitansi. |
| POST | `/api/v1/events/{id}/receipts` | AUTH | Upload kuitansi (multipart `file` + `resident_id?`, `amount`, `description`). |
| GET | `/api/v1/events/{id}/transparency` | AUTH | Data transparansi (budget, partisipasi, donasi). |
| GET | `/api/v1/events/{id}/sponsors` | AUTH | List sponsor. |
| POST | `/api/v1/events/{id}/sponsors` | ADMIN | Tambah sponsor. Body: `{name, amount, type: cash\|goods\|service, notes?}`. |
| DELETE | `/api/v1/events/{id}/sponsors/{sponsorId}` | ADMIN | Hapus sponsor. |

---

## 8. Aspirations & Needs

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/aspirations` | AUTH | List aspirasi internal. |
| GET | `/api/v1/aspirations/{id}` | AUTH | Detail aspirasi. |
| PUT | `/api/v1/aspirations/{id}` | ADMIN | Update status & respons. Body: `{status, response?}`. |
| GET | `/api/v1/needs` | AUTH | List kebutuhan. |
| POST | `/api/v1/needs` | ADMIN | Buat kebutuhan. Body: `{title, description?, estimated_cost?, status?, progress_notes?}`. |
| GET | `/api/v1/needs/{id}` | AUTH | Detail kebutuhan. |
| PUT | `/api/v1/needs/{id}` | ADMIN | Update kebutuhan. |

---

## 9. Announcements & Documents

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/announcements` | AUTH | List pengumuman. |
| POST | `/api/v1/announcements` | ADMIN | Terbitkan. Body: `{title, content, attachment_url?, media_urls?: string[<=10] (http/https), target: all\|residents_only}`. |
| GET | `/api/v1/announcements/{id}` | AUTH | Detail. |
| PUT | `/api/v1/announcements/{id}` | ADMIN | Update. |
| DELETE | `/api/v1/announcements/{id}` | ADMIN | Hapus. |
| GET | `/api/v1/documents` | AUTH | List dokumen. |
| POST | `/api/v1/documents` | ADMIN | Upload/buat. Body: `{title, category, file_url}`. |
| GET | `/api/v1/documents/{id}` | AUTH | Detail. |
| PUT | `/api/v1/documents/{id}` | ADMIN | Update (title/category/file_url). |
| DELETE | `/api/v1/documents/{id}` | ADMIN | Hapus. |

---

## 10. Dashboard & Laporan

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/dashboard/summary` | AUTH | Ringkasan: `{total_residents, total_income, total_expense, balance, total_events, new_aspirations_count}`. |
| GET | `/api/v1/dashboard/reports/financial/export` | AUTH | Export blob. Query: `format=csv\|pdf` (default csv), `start_date`, `end_date`. Frontend pakai `dashboard.ts` blob download (bukan `window.print`). |

---

## 11. Meetings & Notulen (Action Items)

> **Visibilitas**: `public` (warga), `internal` & `confidential` (admin only). Warga non-admin dipaksa `visibility=public` & 403 di detail non-public. Action items meeting non-public hidden.

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/meetings` | AUTH | List notulen. Query: `visibility` (diabaikan non-admin). |
| POST | `/api/v1/meetings` | ADMIN | Buat. Body: `{title, agenda, meeting_date (RFC3339/YYYY-MM-DD), location?, meeting_type?, visibility?, status?, notes?}`. |
| GET | `/api/v1/meetings/{id}` | AUTH | Detail + attendees + decisions + action items. |
| PUT | `/api/v1/meetings/{id}` | ADMIN | Update. |
| DELETE | `/api/v1/meetings/{id}` | ADMIN | Hapus. |
| POST | `/api/v1/meetings/{id}/attendees` | ADMIN | Tambah peserta. Body: `{name, role_or_title?, resident_id?, notes?}`. |
| POST | `/api/v1/meetings/{id}/decisions` | ADMIN | Tambah keputusan. Body: `{decision_text, category?}`. |
| GET | `/api/v1/action-items` | AUTH | List tugas. Query: `status`. Non-admin hanya public. |
| POST | `/api/v1/action-items` | ADMIN | Buat. Body: `{meeting_id, task, assignee_name, due_date?, status?, notes?}`. |
| PUT | `/api/v1/action-items/{id}` | ADMIN | Update. |
| DELETE | `/api/v1/action-items/{id}` | ADMIN | Hapus. |

---

## 12. Social — Reaksi & Polling

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/reactions?target_type=&target_id=` | AUTH | Ringkasan: `{counts, mine, total}`. |
| POST | `/api/v1/reactions` | AUTH | Beri/ubah. Body: `{target_type: announcement\|event\|meeting, target_id, reaction: support\|like\|applause}`. |
| DELETE | `/api/v1/reactions?target_type=&target_id=` | AUTH | Tarik reaksi. |
| GET | `/api/v1/polls` | AUTH | Polling `open` + `my_vote`. |
| POST | `/api/v1/polls` | ADMIN | Buat. Body: `{question, options[2..6]}`. |
| GET | `/api/v1/polls/{id}` | AUTH | Detail + `my_vote`. |
| DELETE | `/api/v1/polls/{id}` | ADMIN | Tutup polling. |
| POST | `/api/v1/polls/{id}/vote` | AUTH | Beri/ubah suara. Body: `{option_index}`. |
| GET | `/api/v1/t/{slug}/polls/{id}` | PUBLIC | Agregat tanpa `my_vote`. |

---

## 13. Push & Social Badge

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/push/config` | PUBLIC | `{enabled, public_key}` (enabled false jika VAPID keys kosong). |
| POST | `/api/v1/push/subscribe` | AUTH | Simpan langganan (via `api` client, bukan axios tanpa auth). |
| POST | `/api/v1/push/unsubscribe` | AUTH | Hapus langganan milik sendiri. |
| GET | `/api/v1/social/badge` | AUTH | Badge: `{reactions_given, votes_cast, total, level: Warga Baru → Utusan Warga}`. |

---

## 14. Konvensi Error

- `401` — token hilang/rusak/kadaluwarsa.
- `403` — role tidak diizinkan / tenant mismatch / escalation.
- `404` — tidak ditemukan (termasuk resource tenant lain — tidak bocor eksistensi).
- `400` — payload invalid (termasuk upload >5MB atau tipe file bukan JPG/PNG/WebP/PDF).
- `405` — method tidak diizinkan (update/delete transaksi append-only).
- `429` — rate limit per-IP, header `Retry-After: 1`. `/health` & `/swagger/` exempt; auth 20/5 per IP.
- Body: `{"error": "<pesan>"}`.

## 15. Upload File

> MinIO terintegrasi (local dev): endpoint upload menyimpan file nyata ke bucket `sitransparan-files` dengan key `<tenant-slug>/<kategori>/<uuid><ext>` dan URL `MINIO_PUBLIC_URL/<bucket>/<key>` (default `http://localhost:9000/...`). Bucket auto-create + public-download policy. Jika storage nil → URL metadata `/uploads/...`. Guard: max 5 MB, hanya JPG/PNG/WebP/PDF → 400. Konfig: `MINIO_ENDPOINT`, `MINIO_PUBLIC_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `MINIO_BUCKET`. Produksi: pertimbangkan presigned URL.

