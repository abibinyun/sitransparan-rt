---
title: "Buku Rekam Migrasi Database (000001–000050)"
description: "Daftar kronologis dan deskripsi 50 file migrasi database PostgreSQL SiTransparan RT/RW"
tags:
  - database
  - migrations
  - sql
  - ledger
---

# 📜 Buku Rekam Migrasi Database (000001–000050)

Setiap perubahan skema database dikelola melalui file migrasi SQL biner (`.up.sql` dan `.down.sql`) di folder `backend/migrations/`.

Berikut adalah rekam jejak lengkap 50 migrasi hingga status terkini:

| ID Migrasi | Nama Berkas Migrasi | Deskripsi & Perubahan Skema |
|---|---|---|
| `000001` | `init_schema` | Inisialisasi skema `public`, tabel `tenants`, `users`, `roles`, `tenant_users`. |
| `000002` | `create_residents` | Tabel `residents`, `family_members`, enkripsi dan blind index NIK. |
| `000003` | `create_financials` | Tabel awal `fee_categories`, `dues_payments`, `financial_transactions`. |
| `000004` | `create_events` | Agenda kegiatan warga (`events`), pos anggaran (`event_budgets`), peserta (`event_participants`). |
| `000005` | `create_aspirations_and_needs` | Kotak aspirasi saran warga dan daftar kebutuhan lingkungan (`community_needs`). |
| `000006` | `create_announcements_and_documents` | Pengumuman kabar warga dan repositori berkas dokumen resmi RT. |
| `000007` | `seed_default_admin` | Seeding akun admin RT bawaan. |
| `000008` | `seed_public_sample_data` | Seeding data contoh publik untuk demonstrasi dan eksplorasi awal. |
| `000009` | `create_event_roles_and_receipts` | Peran kepanitiaan kegiatan (`event_roles`) dan kwitansi sponsor (`event_receipts`). |
| `000010` | `seed_superadmin_tenant_user` | Penugasan user superadmin ke tenant rujukan awal. |
| `000011` | `seed_superadmin_platform_user` | Seeding user superadmin platform global (`abi@gmail.com`). |
| `000012` | `backfill_tenant_schemas` | Prosedur backfill skema untuk tenant yang telah dibuat sebelumnya. |
| `000013` | `fix_superadmin_nil_uuid` | Perbaikan penanganan UUID nil untuk superadmin platform. |
| `000014` | `add_tenant_status` | Penambahan kolom lifecycle `status` (`active`/`inactive`) pada `public.tenants`. |
| `000015` | `alter_family_members_nik_type` | Migrasi tipe data NIK anggota keluarga agar seragam dengan resident. |
| `000016` | `create_funds` | Multi-kantong kas (`funds`) dan migrasi saldo kas tunggal ke kantong default. |
| `000017` | `create_meetings` | Notulen rapat (`meetings`), absensi (`meeting_attendees`), butir keputusan, action items. |
| `000018` | `create_reactions_polls` | Reaksi interaktif warga (`reactions`), jajak pendapat (`polls`), opsi, dan catatan voting (`poll_votes`). |
| `000019` | `announcement_media` | Dukungan array foto/gambar multimedia pada pengumuman (`media_urls`). |
| `000020` | `push_subscriptions` | Tabel `public.push_subscriptions` untuk notifikasi Web Push VAPID browser. |
| `000021` | `create_karang_taruna` | Periode kepengurusan Karang Taruna dan anggota pengurus pemuda. |
| `000022` | `add_photo_to_karang_taruna_members` | Dukungan foto profil pengurus Karang Taruna. |
| `000023` | `enhance_audit_logs` | Penambahan detail payload dan indeks pada tabel `public.audit_logs`. |
| `000024` | `create_houses_and_qr_access` | Master rumah (`houses`), relasi penghuni (`house_residents`), dan token QR rumah (`house_qr_tokens`). |
| `000025` | `support_public_push_subscriptions` | Dukungan langganan push notification publik bagi warga belum login. |
| `000026` | `ensure_tenant_default_funds` | Penjaminan keberadaan kantong kas default otomatis pada setiap tenant baru. |
| `000027` | `create_waste_bank` | Master jenis sampah (`waste_categories`), setoran timbangan (`waste_deposits`), bagi hasil warga-pemuda. |
| `000028` | `cleanup_superadmin_tenant_users` | Pembersihan mapping tenant yang tidak relevan untuk superadmin murni. |
| `000029` | `add_soft_delete_columns` | Penambahan kolom `deleted_at` di seluruh entitas bisnis utama untuk soft-delete. |
| `000030` | `add_house_pin_and_token_version` | Penambahan PIN keamanan rumah dan versi token QR untuk rotasi token. |
| `000031` | `allow_house_poll_voting` | Dukungan voting polling berbasis per-rumah (1 rumah 1 suara). |
| `000032` | `align_default_funds_and_dues` | Penyelarasan kantong kas penampung iuran ke kantong default. |
| `000033` | `add_event_attachments` | Penambahan kolom berkas proposal (`attachment_url`) dan LPJ (`report_url`) pada agenda kegiatan. |
| `000034` | `announcement_file_urls` | Dukungan multi-lampiran dokumen/file PDF pada pengumuman (`file_urls`). |
| `000035` | `add_aspiration_author_and_responder` | Pencatatan identitas pengirim dan admin penanggap pada aspirasi. |
| `000036` | `add_user_id_to_houses` | Penautan akun penanggung jawab kepala keluarga pada master rumah. |
| `000037` | `create_inventory` | Master barang inventaris (`inventory_items`) dan pencatatan peminjaman (`inventory_borrowings`). |
| `000038` | `create_announcement_comments` | Fitur komentar interaktif warga di bawah pengumuman kabar. |
| `000039` | `add_announcement_category` | Kategori pengumuman (`pengumuman`, `kegiatan`, `santai`, `info`). |
| `000040` | `add_announcement_feed_indexes` | Optimalisasi indeks database untuk query feed kabar tak terbatas (infinite scroll). |
| `000041` | `add_pic_to_funds_and_categories` | Penanggung jawab (PIC) pada kantong kas dan kategori iuran. |
| `000042` | `create_rt_structure` | Master periode masa bakti dan susunan pengurus RT (`rt_periods`, `rt_members`). |
| `000043` | `add_poll_vote_scope` | Cakupan hak voting polling (`resident` vs `house`). |
| `000044` | `add_resident_id_to_tenant_users` | Penautan langsung akun login user ke data kependudukan resident (`resident_id`). |
| `000045` | `allow_family_member_in_org_structures` | Fleksibilitas anggota keluarga masuk ke dalam susunan kepengurusan RT/KT. |
| `000046` | `fix_poll_votes_unique_index_for_scope` | Perbaikan indeks unik pencegah dobel voting berbasis scope. |
| `000047` | `fix_poll_user_vote_index_for_scope` | Penyelarasan indeks pencarian status vote pengguna. |
| `000048` | `add_operator_role` | Penambahan role `operator` pada tabel `public.roles` (`00000000-0000-0000-0000-000000000004`) untuk staf operasional RT tanpa hak kelola user. |
| `000049` | `create_waste_attendance` | Manajemen presensi piket pemilah/pengangkut sampah (`waste_attendance`, `waste_attendance_members`) dan alokasi uang lelah/honor per giat. |
| `000050` | `add_payment_date_to_dues_payments` | Penambahan kolom `payment_date TIMESTAMPTZ DEFAULT NOW()` pada `tenant_<slug>.dues_payments` untuk mendukung input tanggal bayar historis/fleksibel dari UI. |

---

## 2. Prosedur Eksekusi Migrasi

Migrasi dieksekusi secara otomatis saat container backend start (`make up`), atau manual melalui CLI migrator:

```bash
# Menjalankan seluruh migrasi yang belum terpasang
make migrate

# Mengecek status versi migrasi
docker compose exec backend /app/server -migrate-status
```

---

## 3. Hubungan Lintas Dokumen

- [[03-database/schema-inventory|Katalog Skema & Tabel Lengkap]]
- [[03-database/data-integrity-rules|Aturan Integritas Data]]
- [[02-modules/keuangan-and-dues|Modul Keuangan & payment_date]]
- [[00-MOC|Kembali ke MOC]]
