# Karang Taruna & Organisasi Kepemudaan RT/RW — Spesifikasi Teknis

**Versi:** 1.0.0  
**Status:** Approved for Implementation  
**Pola Desain:** Multi-Tenant Schema-Isolated (`tenant_<slug>`), Configurable, Scalable

---

## 1. Latar Belakang & Tujuan

Setiap RT/RW memiliki wadah kepemudaan (Karang Taruna / Pemuda RT) yang memiliki:
1. **Struktur Kepengurusan Dinamis & Terkonfigurasi:** Struktur peran inti (Ketua, Wakil, Sekretaris, Bendahara) dan Seksi / Bidang (Olahraga, Seni, Keagamaan, Humas, dll.) yang dapat disesuaikan per tenant/RT tanpa hardcode.
2. **Periode Kepengurusan (Masa Bakti):** Pengurus menjabat per periode (contoh: *2024–2027*), dengan arsip kepengurusan masa lalu dan kepengurusan aktif.
3. **Pendelegasian Akses (Scoped Authority):** Ketua dan Pengurus Inti Pemuda dapat mengelola struktur kepemudaan mereka, mengusulkan anggaran kegiatan ke kas pemuda (*Fund Youth*), tanpa memberikan akses ke data sensitif demografi / kas umum RT.

---

## 2. Model Data & Skema Database

Dibuat dalam skema `tenant_<slug>` via migrasi `000021_create_karang_taruna.up.sql`.

```
┌───────────────────────────────┐
│     karang_taruna_periods     │
├───────────────────────────────┤
│ id (PK, UUID)                 │
│ tenant_id (UUID)              │
│ name (VARCHAR 100)            │ "2024-2027", "Masa Bakti VII"
│ start_date (DATE)             │
│ end_date (DATE)               │
│ status (VARCHAR 20)           │ 'draft' | 'active' | 'archived'
│ sk_number (VARCHAR 100)       │ SK Kepala RT / Lurah
│ sk_file_url (TEXT)            │ URL Dokumen SK di MinIO
│ created_by (UUID)             │
│ created_at, updated_at        │
└───────────────┬───────────────┘
                │ 1:1
┌───────────────▼───────────────┐
│     karang_taruna_configs     │
├───────────────────────────────┤
│ period_id (PK, FK)            │
│ allowed_roles (JSONB)         │ ["ketua","wakil","sekretaris","bendahara","koordinator_seksi","anggota"]
│ allowed_sections (JSONB)      │ ["Olahraga & Kebugaran","Seni & Budaya","Sosial & Humas","Kerohanian"]
│ updated_at                    │
└───────────────────────────────┘
                │ 1:N
┌───────────────▼───────────────┐
│     karang_taruna_members     │
├───────────────────────────────┤
│ id (PK, UUID)                 │
│ period_id (FK, UUID)          │
│ resident_id (FK, UUID)        │ Relasi ke tabel `residents(id)`
│ role (VARCHAR 50)             │ 'ketua' | 'wakil' | 'sekretaris' | 'bendahara' | ...
│ section (VARCHAR 100)         │ 'Olahraga & Kebugaran', 'Seni & Budaya', etc.
│ custom_title (VARCHAR 100)    │ Opsional, e.g. "Koordinator Turnamen Futsal"
│ phone_override (VARCHAR 50)   │ Nomor kontak darurat pemuda (opsional)
│ status (VARCHAR 20)           │ 'aktif' | 'demisioner' | 'nonaktif'
│ joined_at (DATE)              │
│ created_at, updated_at        │
│ UNIQUE (period_id, resident_id)│ 1 warga hanya 1 posisi resmi per periode
└───────────────────────────────┘
```

---

## 3. Otorisasi & Skema RBAC

Tetap menggunakan 3 Role JWT utama (`superadmin`, `admin_rt`, `resident`):

| Aktor | Baca Periode & Anggota | Buat / Edit Periode | Kelola Anggota & Posisi | Konfigurasi Seksi & Peran |
|---|---|---|---|---|
| **Super Admin** | ✅ | ✅ | ✅ | ✅ |
| **Admin RT** | ✅ | ✅ | ✅ | ✅ |
| **Ketua Karang Taruna** *(Resident yang terdaftar role='ketua' & status='aktif' di periode aktif)* | ✅ | ❌ *(Hanya RT yg terbitkan periode/SK)* | ✅ | ✅ |
| **Warga / Anggota** | ✅ *(Publik & internal)* | ❌ | ❌ | ❌ |

---

## 4. API Endpoints

Semua endpoint tenant-scoped berada di bawah `/api/v1/karang-taruna`:

### 4.1 Periode & Konfigurasi
- `GET /api/v1/karang-taruna/periods` — List semua periode (filter `?status=active|archived|draft`)
- `GET /api/v1/karang-taruna/periods/active` — Ambil periode aktif saat ini beserta konfigurasi & ringkasan pengurus
- `POST /api/v1/karang-taruna/periods` — Buat periode baru (Admin RT / Superadmin)
- `PUT /api/v1/karang-taruna/periods/{id}` — Update periode & status (Admin RT / Superadmin)
- `PUT /api/v1/karang-taruna/periods/{id}/config` — Update allowed roles & sections (Admin RT / Ketua Pemuda)

### 4.2 Anggota & Pengurus
- `GET /api/v1/karang-taruna/members` — List pengurus/anggota (query `?period_id=...&section=...&role=...&status=...`)
- `POST /api/v1/karang-taruna/members` — Tambah anggota/pengurus ke periode (Admin RT / Ketua Pemuda)
- `PUT /api/v1/karang-taruna/members/{id}` — Update jabatan/seksi/status anggota (Admin RT / Ketua Pemuda)
- `DELETE /api/v1/karang-taruna/members/{id}` — Hapus anggota dari kepengurusan (Admin RT / Ketua Pemuda)

### 4.3 Publik & Transparansi
- `GET /api/v1/t/{slug}/karang-taruna` — Struktur organisasi kepemudaan aktif publik (nama, foto/inisial, jabatan, seksi — NIK disembunyikan).

---

## 5. Rencana UI Frontend

1. **Halaman Admin:** `/admin/karang-taruna`
   - **Tab 1: Struktur Aktif:** Bagan/Grid pengurus (Ketua, Inti, per Seksi).
   - **Tab 2: Manajemen Periode:** Daftar masa bakti, tombol aktifkan periode, unggah SK.
   - **Tab 3: Konfigurasi Organisasi:** Kustomisasi nama seksi/bidang dan jabatan.
2. **Integrasi Sidebar:** Tambah menu `Karang Taruna` di `MainLayout.tsx`.
3. **Widget Portal Publik:** `/kabar` / portal warga dapat menampilkan widget "Pengurus Pemuda RT Aktif".
