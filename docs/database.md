# Database — Sitransparan RT/RW

Dokumen ini berdasarkan migrasi SQL aktual di `backend/migrations/` (000001–000014) dan DDL provisi schema tenant di `backend/internal/repository/postgres_repos.go`.

Database: PostgreSQL 16, nama default `transparansi_rt`.

## 1. Model Isolasi

- **Schema `public`** — data global/platform: `tenants`, `users`, `roles`, `tenant_users`, `audit_logs`.
- **Schema `tenant_<slug>`** — data operasional per tenant (slug `-` diganti `_`, misal `tenant_sitransparan_rt`). Dibuat otomatis saat tenant dibuat (`CreateTenantSchema`) dan dihapus (`DROP SCHEMA ... CASCADE`) saat tenant dihapus.
- Semua query runtime tenant menggunakan nama tabel schema-qualified `tenant_<slug>.<table>` (helper `TenantTable`).
- Migrasi 000002–000009 mendefinisikan DDL tabel di schema default (public) — tabel ini juga menjadi **sumber seed** yang disalin ke schema tenant oleh migrasi `000012_backfill_tenant_schemas` (idempotent).

## 2. Schema Public

### tenants
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | VARCHAR(255) | Nama RT |
| slug | VARCHAR(255) UNIQUE | Slug tenant (basis nama schema) |
| domain | VARCHAR(255) | Domain; default `<slug>.<TENANT_BASE_DOMAIN>` bila kosong (mis. `rt-003.openrt.local`) |
| logo_url | TEXT | Logo tenant |
| status | VARCHAR(50) default `active` | Lifecycle tenant: `active` (default) / `inactive`. Tenant `inactive` ditolak di semua boundary resolusi (middleware hostname & claims, endpoint publik, switch-tenant) |
| created_at / updated_at | TIMESTAMPTZ | Timestamp |

### users
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt |
| name | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| created_at / updated_at | TIMESTAMPTZ | |

### roles
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Seed: `...01` superadmin, `...02` admin_rt, `...03` resident |
| name | VARCHAR(50) UNIQUE | `superadmin` / `admin_rt` / `resident` |

### tenant_users (mapping user ↔ tenant ↔ role)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants (CASCADE) | |
| user_id | UUID FK → users (CASCADE) | |
| role_id | UUID FK → roles (RESTRICT) | |
| status | VARCHAR(50) default `active` | Hanya `active` yang memberi role/tenant scope |
| created_at / updated_at | TIMESTAMPTZ | |
| UNIQUE (tenant_id, user_id) | | |

### audit_logs
| Kolom | Tipe |
|---|---|
| id | UUID PK |
| tenant_id | UUID (nullable) |
| user_id | UUID (nullable) |
| action | VARCHAR(255) |
| resource | VARCHAR(255) |
| payload | JSONB |
| created_at | TIMESTAMPTZ |

## 3. Schema Tenant (`tenant_<slug>`)

### residents
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → public.tenants (CASCADE) | |
| nik | TEXT | **Enkripsi AES-256-GCM** |
| nik_hash | VARCHAR(64) | Hash HMAC untuk lookup deterministik |
| kk_number | VARCHAR(16) | |
| full_name | VARCHAR(255) | |
| gender | VARCHAR(50) | |
| birth_place | VARCHAR(255) | |
| birth_date | DATE | |
| address | TEXT | |
| rt_rw | VARCHAR(50) | |
| phone | VARCHAR(50) | |
| is_head_of_family | BOOLEAN default FALSE | |
| status | VARCHAR(50) default `pending` | `pending`/`approved`/`rejected` |
| ktp_url / kk_url | TEXT | Referensi file MinIO |
| created_at / updated_at | TIMESTAMPTZ | |

### family_members
`id`, `resident_id` (FK → residents CASCADE), `full_name`, `nik`, `relation`, `birth_date`, `gender`, `created_at`, `updated_at`.

### fee_categories
`id`, `tenant_id`, `name`, `amount NUMERIC(15,2)`, `period` (`monthly`/`one_time`), `description`, `created_at`, `updated_at`.

### dues_payments (iuran warga)
`id`, `tenant_id`, `resident_id` (FK CASCADE), `fee_category_id` (FK RESTRICT), `amount`, `period_month`, `period_year`, `status` (`pending`/`verified`/`rejected`), `proof_url`, `verified_at`, `verified_by` (FK → public.users), `created_at`, `updated_at`.

### financial_transactions (buku kas — append-only)
`id`, `tenant_id`, `type` (`income`/`expense`), `category`, `amount`, `transaction_date DATE default CURRENT_DATE`, `description`, `proof_url`, `created_by` (FK → public.users), `created_at`, `updated_at`.

> Update/delete transaksi diblokir di handler (405). Koreksi memakai reversing entry (transaksi lawan).

### events
`id`, `tenant_id`, `title`, `description`, `event_date TIMESTAMPTZ`, `location`, `status` (`planned`/`ongoing`/`completed`/`cancelled`), `created_by` (FK → public.users), `created_at`, `updated_at`.

### event_budgets (RAB)
`id`, `event_id` (FK CASCADE), `item`, `category`, `description`, `planned_amount`, `actual_amount`, `estimated_cost`, `actual_cost` (NUMERIC(15,2)), `created_at`, `updated_at`.

### event_participants (RSVP)
`id`, `event_id` (FK CASCADE), `resident_id` (FK CASCADE), `status` (`attending`/`absent`/`maybe`), `created_at`, `updated_at`, UNIQUE (event_id, resident_id).

### event_sponsors
`id`, `event_id` (FK CASCADE), `name`, `amount`, `type` (`cash`/`goods`/`service`), `notes`, `created_at`, `updated_at`.

### event_roles (panitia acara)
`id`, `event_id` (FK CASCADE), `resident_id` (FK CASCADE), `role VARCHAR(100)` (contoh: Ketua Panitia, Bendahara, Sekretaris), `created_at`, `updated_at`, UNIQUE (event_id, resident_id, role).

### event_receipts (kuitansi donasi)
`id`, `event_id` (FK CASCADE), `resident_id` (FK SET NULL), `receipt_url`, `amount`, `description`, `created_at`, `updated_at`.

### aspirations
`id`, `tenant_id`, `resident_id` (FK SET NULL), `title`, `content`, `category` (`suggestion`/`complaint`/`question`), `status` (`submitted`/`under_review`/`resolved`/`rejected`), `is_anonymous BOOLEAN default FALSE`, `response TEXT`, `created_at`, `updated_at`.

### community_needs
`id`, `tenant_id`, `title`, `description`, `estimated_cost`, `status` (`proposed`/`approved`/`in_progress`/`completed`), `progress_notes`, `created_at`, `updated_at`.

### announcements
`id`, `tenant_id`, `title`, `content`, `attachment_url`, `target` (`all`/`residents_only`), `created_by` (FK → public.users), `created_at`, `updated_at`.

### documents
`id`, `tenant_id`, `title`, `category` (`financial_report`/`minutes`/`letter`/`other`), `file_url`, `uploaded_by` (FK → public.users), `created_at`, `updated_at`.

## 4. Daftar Migrasi

| Migrasi | Isi |
|---|---|
| 000001_init_schema | `uuid-ossp`, tenants, users, roles (seed 3 role), tenant_users, audit_logs; seed `superadmin@platform.local` & `admin@gmail.com` |
| 000002_create_residents | residents, family_members |
| 000003_create_financials | fee_categories, dues_payments, financial_transactions |
| 000004_create_events | events, event_budgets, event_participants |
| 000005_create_aspirations_and_needs | event_sponsors, aspirations, community_needs |
| 000006_create_announcements_and_documents | announcements, documents |
| 000007_seed_default_admin | Seed tenant `sitransparan-rt` + admin `admin@sitransparan.rt` (admin_rt) |
| 000008_seed_public_sample_data | Data demo publik (pengumuman, dokumen, aspirasi, kebutuhan) |
| 000009_create_event_roles_and_receipts | event_roles, event_receipts |
| 000010_seed_superadmin_tenant_user | Mapping tenant_users superadmin untuk `admin@gmail.com` |
| 000011_seed_superadmin_platform_user | Mapping tenant_users superadmin untuk `superadmin@platform.local` |
| 000012_backfill_tenant_schemas | Provisi schema tenant untuk tenant lama + salin data seed (idempotent) |
| 000013_fix_superadmin_nil_uuid | Perbaiki UUID nil `superadmin@platform.local` → UUID valid (guarded) |
| 000014_add_tenant_status | Tambah kolom `status` (`active`/`inactive`, default `active`) pada `tenants` untuk lifecycle tenant (disable tenant → deny di semua boundary) |

Catatan seed: migrasi 000001 seed `superadmin@platform.local` dengan UUID valid; migrasi 000013 memperbaiki instalasi lama yang terkena seed UUID nil.
