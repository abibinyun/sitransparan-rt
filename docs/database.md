# Database — Sitransparan RT/RW

Dokumen ini berdasarkan migrasi SQL aktual di `backend/migrations/` (000001–000027) dan DDL provisi schema tenant di `backend/internal/repository/postgres_repos.go`.

Database: PostgreSQL 16, nama default `transparansi_rt`.

## 1. Model Isolasi

- **Schema `public`** — data global/platform: `tenants`, `users`, `roles`, `tenant_users`, `audit_logs`, `portal_events`, `push_subscriptions`.
- **Schema `tenant_<slug>`** — data operasional per tenant (slug `-` diganti `_`, misal `tenant_sitransparan_rt`). Dibuat otomatis saat tenant dibuat (`CreateTenantSchema`). Saat tenant dihapus, sistem menerapkan **soft-delete** (`deleted_at = NOW()`, `status = 'inactive'`) sehingga data dan schema tetap utuh dan dapat direstore sewaktu-waktu.
- Semua query runtime tenant menggunakan nama tabel schema-qualified `tenant_<slug>.<table>` (helper `TenantTable`).
- Migrasi 000002–000009 mendefinisikan DDL tabel di schema default (public) — tabel ini juga menjadi **sumber seed** yang disalin ke schema tenant oleh `000012_backfill_tenant_schemas` (idempotent). `000016–000027` menambah funds/meetings/reactions/polls/media/push/houses/waste_bank.

## 2. Schema Public

### tenants
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | VARCHAR(255) | Nama RT |
| slug | VARCHAR(255) UNIQUE | Basis nama schema |
| domain | VARCHAR(255) | Domain; default `<slug>.<TENANT_BASE_DOMAIN>` |
| logo_url | TEXT | Logo tenant |
| status | VARCHAR(50) default `active` | `active`/`inactive` (000014). `inactive` → deny di semua boundary |
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
| status | VARCHAR(50) default `active` | Hanya `active` yang memberi scope |
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

### portal_events (KPI ringan lintas tenant, 000019)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGSERIAL PK | |
| tenant_slug | VARCHAR(100) | |
| event_type | VARCHAR(50) | `feed_view`/`share_opened`/`reaction_given`/`vote_cast` |
| target_id | UUID | |
| user_id | UUID FK → users (SET NULL) | |
| created_at | TIMESTAMPTZ | |
| idx | | `idx_portal_events_type_time (tenant_slug, event_type, created_at DESC)` |

### push_subscriptions (Web Push, 000020)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users (CASCADE) | |
| endpoint | TEXT UNIQUE | |
| p256dh | TEXT | |
| auth | TEXT | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | |
| idx | | `idx_push_subscriptions_user (user_id)` |

## 3. Schema Tenant (`tenant_<slug>`) — 27+ tabel

Termasuk tabel inti tata kelola, transparansi kas, rapat warga, Karang Taruna (`karang_taruna_periods`, `karang_taruna_configs`, `karang_taruna_members`), Master Rumah (`houses`, `house_residents`, `house_qr_tokens`), dan Bank Sampah (`waste_categories`, `waste_deposits`, `waste_deposit_items`).

### residents
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → public.tenants (CASCADE) | |
| nik | TEXT | AES-256-GCM terenkripsi |
| nik_hash | VARCHAR(64) | HMAC lookup |
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
| ktp_url / kk_url | TEXT | Referensi MinIO |
| created_at / updated_at | TIMESTAMPTZ | |

### family_members
`id`, `resident_id` (FK CASCADE), `full_name`, `nik` (TEXT — 000015, was VARCHAR(16) overflow terenkripsi), `relation`, `birth_date`, `gender`, `created_at`, `updated_at`.

### fee_categories
`id`, `tenant_id`, `name`, `amount NUMERIC(15,2)`, `period` (`monthly`/`one_time`), `description`, `created_at`, `updated_at`. Default `Iuran Warga` (monthly) seeded idempotent saat schema dibuat.

### dues_payments
`id`, `tenant_id`, `resident_id` (FK CASCADE), `fee_category_id` (FK RESTRICT), `amount`, `period_month`, `period_year`, `status` (`pending`/`verified`/`rejected`), `proof_url`, `verified_at`, `verified_by` (FK → public.users), `created_at`, `updated_at`. List join `resident_name` & `fee_category_name`.

### financial_transactions (append-only)
`id`, `tenant_id`, `type` (`income`/`expense`), `category`, `amount`, `transaction_date DATE default CURRENT_DATE`, `description`, `proof_url`, `fund_id UUID FK → funds (SET NULL)` (000016), `created_by` (FK → public.users), `created_at`, `updated_at`. PUT/DELETE → 405.

### funds (multi-kantong, 000016)
`id`, `tenant_id` (FK CASCADE), `name`, `type` (`operational`/`social`/`youth`/`infrastructure`/`other`), `description`, `is_default BOOLEAN` (unik guard di usecase), `created_at`, `updated_at`. Seed default per tenant: `Kas Utama RT` (is_default true), `Kas Karang Taruna`, `Dana Sosial & Kematian`. Tabel ada di `public` (referensi) dan tiap `tenant_<slug>`.

### events
`id`, `tenant_id`, `title`, `description`, `event_date TIMESTAMPTZ`, `location`, `status` (`planned`/`ongoing`/`completed`/`cancelled`), `created_by`, `created_at`, `updated_at`.

### event_budgets (RAB)
`id`, `event_id` (FK CASCADE), `item`, `category`, `description`, `planned_amount`, `actual_amount`, `estimated_cost`, `actual_cost` (NUMERIC(15,2)), `created_at`, `updated_at`. Di-embed di `GET /events` list.

### event_participants (RSVP)
`id`, `event_id` (FK CASCADE), `resident_id` (FK CASCADE), `status` (`attending`/`absent`/`maybe`), `created_at`, `updated_at`, UNIQUE (event_id, resident_id).

### event_sponsors
`id`, `event_id` (FK CASCADE), `name`, `amount`, `type` (`cash`/`goods`/`service`), `notes`, `created_at`, `updated_at`.

### event_roles
`id`, `event_id` (FK CASCADE), `resident_id` (FK CASCADE), `role VARCHAR(100)`, `created_at`, `updated_at`, UNIQUE (event_id, resident_id, role).

### event_receipts
`id`, `event_id` (FK CASCADE), `resident_id` (FK SET NULL), `receipt_url`, `amount`, `description`, `created_at`, `updated_at`.

### aspirations
`id`, `tenant_id`, `resident_id` (FK SET NULL), `title`, `content`, `category` (`suggestion`/`complaint`/`question`), `status` (`submitted`/`under_review`/`resolved`/`rejected`), `is_anonymous`, `response`, `created_at`, `updated_at`.

### community_needs
`id`, `tenant_id`, `title`, `description`, `estimated_cost`, `status` (`proposed`/`approved`/`in_progress`/`completed`), `progress_notes`, `created_at`, `updated_at`.

### announcements (media_urls 000019, file_urls 000034, allow_comments 000038, category 000039, feed_indexes 000040)
`id`, `tenant_id`, `title`, `content`, `attachment_url`, `media_urls JSONB DEFAULT '[]'` (max 10), `file_urls JSONB DEFAULT '[]'` (max 10), `category VARCHAR(50) DEFAULT 'pengumuman'`, `target` (`all`/`residents_only`), `allow_comments BOOLEAN DEFAULT false`, `created_by`, `created_at`, `updated_at`, `deleted_at`; idx `(deleted_at, target, created_at DESC)`, idx `(deleted_at, category, created_at DESC)`.

### announcement_comments (000038)
`id`, `announcement_id` (FK CASCADE), `user_id` (FK CASCADE), `author_name`, `house_block`, `content VARCHAR(255)`, `created_at`, `updated_at`, `deleted_at`; idx `announcement_id`, idx `user_id`, idx `created_at DESC`.

### documents
`id`, `tenant_id`, `title`, `category` (`financial_report`/`minutes`/`letter`/`other`), `file_url`, `uploaded_by`, `created_at`, `updated_at`.

### meetings + attendees + decisions + action_items (000017)
- `meetings`: `id`, `title`, `agenda` (TEXT NOT NULL), `meeting_date TIMESTAMPTZ`, `location`, `meeting_type` (`regular`/`emergency`/`karang_taruna`/`rtrw_pleno`), `visibility` (`public`/`internal`/`confidential`), `status` (`scheduled`/`ongoing`/`completed`/`cancelled`), `notes`, `created_by`, `created_at`, `updated_at`; idx `meeting_date DESC`.
- `meeting_attendees`: `id`, `meeting_id` (CASCADE), `resident_id` (SET NULL), `name`, `role_or_title` (default `Warga`), `attended`, `notes`, `created_at`.
- `meeting_decisions`: `id`, `meeting_id` (CASCADE), `decision_text`, `category` (default `Umum`), `created_at`.
- `meeting_action_items`: `id`, `meeting_id` (CASCADE), `task`, `assignee_name`, `assignee_resident_id` (SET NULL), `due_date DATE`, `status` (`pending`/`in_progress`/`completed`/`cancelled`), `notes`, `created_at`, `updated_at`; idx `status`.

### reactions (000018)
`id`, `target_type` (`announcement`/`event`/`meeting`), `target_id`, `user_id` (FK CASCADE), `reaction` (`support`/`like`/`applause`), `created_at`, UNIQUE (target_type, target_id, user_id); idx `(target_type, target_id)`.

### polls + poll_votes (000018)
- `polls`: `id`, `question`, `options JSONB` (2–6), `status` (`open`/`closed`), `created_by`, `created_at`, `closed_at`.
- `poll_votes`: `id`, `poll_id` (CASCADE), `user_id` (CASCADE), `option_index SMALLINT >=0`, `created_at`, UNIQUE (poll_id, user_id).

### houses + house_residents + house_qr_tokens (000024, 000030, 000036)
- `houses`: `id`, `block_number` (VARCHAR(50) — Atas Nama / Blok Rumah), `address` (TEXT — Alamat / Keterangan Lokasi), `head_resident_id` (FK → residents SET NULL), `user_id` (FK → public.users SET NULL), `access_token` (VARCHAR(64) UNIQUE), `token_status` (`active`/`revoked`/`suspended`), `pin_code` (VARCHAR(10)), `token_version` (INT default 1), `deleted_at`, `created_at`, `updated_at`.
  - *Aturan Penghapusan:* Menggunakan `ON DELETE SET NULL`. Hapus rumah tidak menghapus warga/user; hapus warga tidak menghapus rumah fisik; hapus user tidak menghapus data kependudukan dan stiker QR rumah.
- `residents`: Ditambahkan relasi `house_id UUID REFERENCES houses(id) ON DELETE SET NULL`.

## 4. Daftar Migrasi (000001–000042)

| Migrasi | Isi |
|---|---|
| 000001_init_schema | `uuid-ossp`, tenants, users, roles (3), tenant_users, audit_logs; seed `superadmin@platform.local` & `admin@gmail.com` |
| 000002_create_residents | residents, family_members |
| 000003_create_financials | fee_categories, dues_payments, financial_transactions |
| 000004_create_events | events, event_budgets, event_participants |
| 000005_create_aspirations_and_needs | event_sponsors, aspirations, community_needs |
| 000006_create_announcements_and_documents | announcements, documents |
| 000007_seed_default_admin | Seed tenant `sitransparan-rt` + admin `admin@sitransparan.rt` |
| 000008_seed_public_sample_data | Data demo publik |
| 000009_create_event_roles_and_receipts | event_roles, event_receipts |
| 000010_seed_superadmin_tenant_user | Mapping tenant_users superadmin `admin@gmail.com` |
| 000011_seed_superadmin_platform_user | Mapping tenant_users superadmin `superadmin@platform.local` |
| 000012_backfill_tenant_schemas | Provisi schema tenant lama + salin seed (idempotent) |
| 000013_fix_superadmin_nil_uuid | Perbaiki UUID nil `superadmin@platform.local` |
| 000014_add_tenant_status | Kolom `status` (`active`/`inactive`) pada `tenants` |
| 000015_alter_family_members_nik_type | `family_members.nik` `VARCHAR(16)` → `TEXT` |
| 000016_create_funds | `public.funds` + `tenant_*.funds` + `financial_transactions.fund_id`; seed 3 funds default + backfill |
| 000017_create_meetings | `meetings`, `meeting_attendees`, `meeting_decisions`, `meeting_action_items` per tenant |
| 000018_create_reactions_polls | `reactions`, `polls`, `poll_votes` per tenant (+ index) |
| 000019_announcement_media | `announcements.media_urls JSONB` + `portal_events` (KPI) |
| 000020_push_subscriptions | `push_subscriptions` di public schema (Web Push) |
| 000021_create_karang_taruna | `karang_taruna_periods`, `karang_taruna_configs`, `karang_taruna_members` |
| 000022_add_photo_to_karang_taruna_members | `photo_url` pada `karang_taruna_members` |
| 000023_enhance_audit_logs | `audit_logs` (ip_address, user_agent, metadata, status, target_table, record_id) |
| 000024_create_houses_and_qr_access | Master data rumah, penomoran stiker QR, token versi |
| 000025_support_public_push_subscriptions | Push subscription lingkup publik/tenant |
| 000026_ensure_tenant_default_funds | 4 kantong kas standar: `operational`, `youth`, `social`, `infrastructure` |
| 000027_create_waste_bank | `waste_categories`, `waste_deposits`, `waste_deposit_items` (Bank Sampah) |
| 000028_cleanup_superadmin_tenant_users | Pembersihan mapping tenant user superadmin redundan |
| 000029_add_soft_delete_columns | Kolom `deleted_at` dan indeks soft delete di tabel utama |
| 000030_add_house_pin_and_token_version | PIN rumah & token versioning untuk akses stiker QR |
| 000031_allow_house_poll_voting | Hak voting polling berbasis rumah/token QR |
| 000032_align_default_funds_and_dues | Sinkronisasi alokasi kantong kas default & iuran warga |
| 000033_add_event_attachments | Berkas proposal (`attachment_url`) dan LPJ (`report_url`) pada events |
| 000034_announcement_file_urls | Multi-file dokumen lampiran `file_urls JSONB` pada announcements |
| 000035_add_aspiration_author_and_responder | Nama pengusul & penanggap resmi pada aspirasi |
| 000036_add_user_id_to_houses | Relasi `user_id` pada tabel `houses` |
| 000037_create_inventory | Peminjaman & master inventaris warga (`inventory_items`, `inventory_borrowings`) |
| 000038_create_announcement_comments | Sakelar `allow_comments` & tabel `announcement_comments` |
| 000039_add_announcement_category | Kolom `category VARCHAR(50)` pada announcements (pengumuman, kegiatan, santai, info) |
| 000040_add_announcement_feed_indexes | Indeks komposit feed publik & filter kategori untuk performa tinggi |
| 000041_add_pic_to_funds_and_categories | Kolom `pic_user_id` pada tabel `funds` dan `fee_categories` untuk delegasi penanggung jawab per-user |

Catatan seed: 000001 UUID valid untuk `superadmin@platform.local`; 000013 guard instalasi lama nil UUID.
