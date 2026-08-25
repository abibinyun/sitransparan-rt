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
| GET | `/api/v1/t/resolve` | Resolusi hostname/custom domain ke slug tenant yang aktif. Query: `host={domain}`. Response: `{"slug":"..."}`. |
| GET | `/api/v1/t/{slug}/info` | Info tenant publik (id, name, slug, domain, logo_url). Response: `{data: tenant}`. |
| GET | `/api/v1/t/{slug}/announcements` | List pengumuman publik. Query: `limit`, `offset`. |
| GET | `/api/v1/t/{slug}/documents` | List dokumen publik. Query: `limit`, `offset`. |
| GET | `/api/v1/t/{slug}/aspirations` | List aspirasi publik (tanpa identitas resident). |
| POST | `/api/v1/t/{slug}/aspirations` | Submit aspirasi publik anonim (`resident_id` diabaikan). |
| GET | `/api/v1/t/{slug}/needs` | List kebutuhan lingkungan publik. |
| GET | `/api/v1/t/{slug}/meetings` | Notulen rapat **publik saja** (sanitasi: tanpa notes internal & tanpa `created_by`). Tenant harus aktif; hostname mismatch → 404. |
| GET | `/api/v1/t/{slug}/financial-summary` | Ringkasan kas **agregat saja** (`current_balance`, `monthly_income`, `monthly_expense`, `spending_breakdown`) — tanpa data pembayar/funds. |
| GET | `/api/v1/t/{slug}/polls/{id}` | Hasil **agregat** polling untuk portal publik (tanpa `my_vote`, tanpa identitas voter). |

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
| GET | `/api/v1/superadmin/tenants` | SUPERADMIN | List tenant. Query: `limit`, `offset`. Response: `{tenants, total}`. **Default `limit` = 500** (sebelumnya 10 — tenant lama tersembunyi dari dropdown superadmin sehingga user tidak bisa di-assign; sudah diperbaiki). |
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
| GET | `/api/v1/residents` | ADMIN | List warga. Query: `q` (cari nama/NIK), `is_head_of_family=true\|false` (filter kepala keluarga), `limit`, `offset`. Response: `{data, total, limit, offset}` — tiap item menyertakan `family_members` (daftar anggota keluarga). |
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
| GET | `/api/v1/financial/funds` | AUTH | List kantong kas (multi-fund). |
| POST | `/api/v1/financial/funds` | ADMIN | Buat kantong kas. Body: `{name, description?, target_amount?}`. |
| GET | `/api/v1/financial/funds/{id}` | AUTH | Detail kantong kas. |
| PUT | `/api/v1/financial/funds/{id}` | ADMIN | Update kantong kas. |
| DELETE | `/api/v1/financial/funds/{id}` | ADMIN | Hapus kantong kas. |
| GET | `/api/v1/financial/categories` | AUTH | List kategori iuran. |
| POST | `/api/v1/financial/categories` | ADMIN | Buat kategori iuran. |
| GET | `/api/v1/financial/categories/{id}` | AUTH | Detail kategori. |
| PUT | `/api/v1/financial/categories/{id}` | ADMIN | Update kategori. |
| DELETE | `/api/v1/financial/categories/{id}` | ADMIN | Hapus kategori. |
| GET | `/api/v1/financial/summary` | AUTH | Ringkasan kas: `{current_balance, monthly_income, monthly_expense, spending_breakdown}` (field ini yang dikembalikan backend — dashboard/UI memetakannya). |
| GET | `/api/v1/financial/dues` | AUTH | List pembayaran iuran. Query: `resident_id`, `limit`, `offset`. Response menyertakan `resident_name` & `fee_category_name` (hasil `LEFT JOIN`, bukan UUID). |
| POST | `/api/v1/financial/dues` | ADMIN | Catat pembayaran iuran. |
| POST | `/api/v1/financial/dues/{id}/verify` | ADMIN | Verifikasi iuran. Body: `{status: "verified"\|"rejected"}`. |
| GET | `/api/v1/financial/transactions` | AUTH | List transaksi kas. Query: `type` (`income`/`expense`), `limit`, `offset`. |
| POST | `/api/v1/financial/transactions` | ADMIN | Catat transaksi kas. Body opsional menyertakan `fund_id` untuk mengaitkan transaksi ke kantong kas. |
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

## 11. Meetings & Notulen Rapat (Action Items)

> **Visibilitas**: `public` (terlihat warga), `internal` & `confidential` (hanya admin).
> Warga (role `resident`) hanya dapat membaca meeting `public`; percobaan lain → `403`.
> Action items milik meeting non-public juga disembunyikan dari warga.

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/meetings` | AUTH | List notulen. Query: `visibility` (**diabaikan untuk non-admin** — warga dipaksa `public`). |
| POST | `/api/v1/meetings` | ADMIN | Buat notulen. Body: `{title, agenda, meeting_date (RFC3339/YYYY-MM-DD), location?, meeting_type?, visibility?, status?, notes?}`. |
| GET | `/api/v1/meetings/{id}` | AUTH | Detail notulen + attendees + decisions + action items. Non-admin hanya `public`. |
| PUT | `/api/v1/meetings/{id}` | ADMIN | Update notulen. |
| DELETE | `/api/v1/meetings/{id}` | ADMIN | Hapus notulen. |
| POST | `/api/v1/meetings/{id}/attendees` | ADMIN | Tambah peserta. Body: `{name, role_or_title?, resident_id?, notes?}`. |
| POST | `/api/v1/meetings/{id}/decisions` | ADMIN | Tambah keputusan. Body: `{decision_text, category?}`. |
| GET | `/api/v1/action-items` | AUTH | List tugas/tindak lanjut. Query: `status`. Non-admin hanya melihat item milik meeting `public`. |
| POST | `/api/v1/action-items` | ADMIN | Buat tugas. Body: `{meeting_id, task, assignee_name, due_date?, status?, notes?}`. |
| PUT | `/api/v1/action-items/{id}` | ADMIN | Update status/detail tugas. |
| DELETE | `/api/v1/action-items/{id}` | ADMIN | Hapus tugas. |

---

## 12. Social Interactions — Reaksi & Polling (Fase 3)

> Gerbang keamanan: identitas selalu dari JWT (bukan body); 1 user 1 reaksi per target
> dan 1 user 1 suara per polling (unique constraint DB); kelola polling = admin;
> endpoint interaksi memakai budget rate-limit ketat.

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/v1/reactions?target_type=&target_id=` | AUTH | Ringkasan: `{counts, mine, total}`. |
| POST | `/api/v1/reactions` | AUTH | Beri/ubah reaksi. Body: `{target_type (announcement\|event\|meeting), target_id, reaction (support\|like\|applause)}`. |
| DELETE | `/api/v1/reactions?target_type=&target_id=` | AUTH | Tarik reaksi. |
| GET | `/api/v1/polls` | AUTH | Polling `open` + hasil agregat + `my_vote`. |
| POST | `/api/v1/polls` | ADMIN | Buat polling. Body: `{question, options[2..6]}`. |
| GET | `/api/v1/polls/{id}` | AUTH | Detail + agregat + `my_vote`. |
| DELETE | `/api/v1/polls/{id}` | ADMIN | Tutup polling. |
| POST | `/api/v1/polls/{id}/vote` | AUTH | Beri/ubah suara. Body: `{option_index}`. |
| GET | `/api/v1/t/{slug}/polls/{id}` | PUBLIC | Hasil agregat saja (tanpa `my_vote`). |

---

## 13. Konvensi Error

- `401` — token hilang/rusak/kadaluwarsa/manipulasi.
- `403` — role tidak diizinkan / tenant access denied / role escalation.
- `404` — resource tidak ditemukan (termasuk resource tenant lain — tidak membocorkan eksistensi).
- `400` — payload tidak valid.
- `405` — method tidak diizinkan (contoh: update/delete transaksi keuangan).
- `429` — rate limit tercapai (**per client IP**, header `Retry-After: 1`). `/health` & `/swagger/` dikecualikan; endpoint auth (`/login`, `/register`) memakai budget lebih ketat (default 20 burst / 5 per detik per IP).
- Response error: `{"error": "<pesan>"}`.

## 14. Catatan Upload File

> ✅ **MinIO terintegrasi (local dev).** Endpoint upload (`/financial/upload`, `/residents/upload`, `POST /documents`, `POST /events/{id}/receipts`) kini menyimpan file sungguhan ke bucket object storage (default `sitransparan-files`) dengan key ber-prefix per tenant (`<tenant-slug>/<kategori>/<uuid><ext>`), dan mengembalikan URL unduh publik (`MINIO_PUBLIC_URL/<bucket>/<key>`, default `http://localhost:9000/...`). Bucket dibuat otomatis saat startup dengan kebijakan download-publik; tulis selalu melalui API. Jika storage tidak tersedia, server tetap jalan namun upload hanya menghasilkan URL metadata (`/uploads/...`) yang tidak terserve. Konfigurasi: `MINIO_ENDPOINT` (hostname dalam network docker), `MINIO_PUBLIC_URL` (alamat yang dapat dijangkau browser), `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `MINIO_BUCKET`. Catatan produksi: pertimbangkan presigned URL agar bucket tidak public-read.
