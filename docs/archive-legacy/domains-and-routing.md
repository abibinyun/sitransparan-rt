# Domain, Multi-Tenancy & Routing — Sitransparan RT/RW

**Status:** Referensi kanonik untuk model domain, struktur URL, dan setup domain lokal.
**Konteks:** Setiap tenant = 1 RT. Tenant diidentifikasi lewat **subdomain otomatis**
(`<slug>.<baseDomain>`) atau **custom domain** yang didaftarkan saat pembuatan tenant
(halaman `/admin/tenants`, akses SuperAdmin).

---

## 1. Model Domain Tenant

Saat SuperAdmin mendaftarkan RT baru:

| Field | Perilaku |
|---|---|
| **Slug** | Menentukan subdomain otomatis: `<slug>.<TENANT_BASE_DOMAIN>` (contoh: slug `rt-003` → `rt-003.openrt.local`). Juga dipakai di path API publik `/api/v1/t/{slug}/...`. |
| **Custom Domain (opsional)** | Jika diisi (contoh `rt01.perumahan.com`), domain itu yang menjadi identitas tenant — subdomain otomatis **tidak** dibuat. |

Aturan resolusi (konsisten di frontend & backend):

```text
Hostname request
├─ localhost / 127.0.0.1 / base domain tanpa sub  → tenant DEFAULT (fallback dev)
├─ <slug>.<TENANT_BASE_DOMAIN>                    → tenant dengan slug tsb
│   (subdomain ter-reserve: app, api, www, admin, auth, mail → BUKAN tenant)
├─ custom domain terdaftar di tabel tenants       → tenant pemilik domain
└─ hostname lain / tidak dikenal                  → ditolak (bukan tenant mana pun)
```

- `TENANT_BASE_DOMAIN` (backend) & `VITE_TENANT_BASE_DOMAIN` (frontend build-arg) harus
  sama. Default dev: `openrt.local`; produksi: `domainapp.com` milik Anda.
- Port diabaikan saat resolusi (`openrt.local:3000` ≡ `openrt.local`).
- **Backend adalah batas keamanan**: setiap request tetap divalidasi ulang terhadap
  tabel `tenants` (status aktif) dan identitas JWT — hostname hanya penunjuk arah.

---

## 2. Struktur URL Aplikasi

Portal publik berada di **root** (bekerja identik di hostname mana pun — root domain,
subdomain tenant, atau custom domain; tenant yang tampil mengikuti resolusi hostname):

| Path | Halaman | Auth |
|---|---|---|
| `/` | Kabar Lingkungan (feed: pengumuman, kas, musyawarah, polling) | publik |
| `/usulan` | Aspirasi & Kebutuhan | publik |
| `/agenda` | Jadwal & Agenda Kegiatan | publik |
| `/login` | Masuk / Daftar | publik |

Rute lama `/public/announcements|aspirations|events` **tetap hidup sebagai alias**
(redirect ke path baru) demi tautan lama.

Halaman internal pengurus berada di namespace `/admin` (butuh login):

| Path | Halaman | Role |
|---|---|---|
| `/admin` | Dashboard | admin_rt, superadmin |
| `/admin/residents` | Data warga | admin |
| `/admin/financial` | Keuangan & kantong kas | admin |
| `/admin/events` | Kegiatan & RAB | admin |
| `/admin/meetings` | Notulen & tindak lanjut | admin |
| `/admin/aspirations` | Kelola aspirasi | admin |
| `/admin/announcements` | Kelola pengumuman & dokumen | admin |
| `/admin/users` | Manajemen pengguna | admin |
| `/admin/tenants` | Manajemen tenant | superadmin |

Subdomain `admin.<baseDomain>` di-reserve untuk keperluan ini (tidak pernah dianggap
sebagai slug tenant).

---

## 3. Resolusi Tenant di Frontend

Dua lapis, di `frontend/src/utils/tenant.ts` + endpoint resolve:

1. **Fast path (tanpa API)** — hostname berpola `<slug>.<TENANT_BASE_DOMAIN>` → slug
   dibaca langsung dari hostname.
2. **Custom domain** — hostname di luar base domain (mis. `rt01.perumahan.com`) tidak
   bisa dipecah secara lokal, maka frontend memanggil:
   ```http
   GET /api/v1/t/resolve?host=rt01.perumahan.com   → 200 { "slug": "rt-01" } | 404
   ```
   (publik, rate-limited; hanya mengembalikan slug tenant yang **aktif**). Hasilnya
   di-cache untuk sesi tersebut.

Semua hook data portal (`/api/v1/t/{slug}/...`) memakai slug hasil resolusi ini, jadi
portal publik menampilkan tenant yang benar di hostname mana pun.

---

## 4. Setup Domain di Local Development

Tanpa Traefik/TLS — cukup `/etc/hosts` (atau `hosts` Windows) karena resolusi tenant
murni berbasis hostname + port bebas:

```text
127.0.0.1 openrt.local rt-003.openrt.local rt-004.openrt.local rt01.perumahan.com
```

Kemudian (stack berjalan di port 3000):

| URL | Portal yang tampil |
|---|---|
| `http://openrt.local:3000` | Portal tenant **default** (dev: `sitransparan-rt`) |
| `http://rt-003.openrt.local:3000` | Portal tenant **rt-003** |
| `http://rt01.perumahan.com:3000` | Portal tenant pemilik custom domain tsb |
| `http://localhost:3000` | Portal tenant default (perilaku lama tetap jalan) |

Untuk pengujian E2E headless, `playwright.config.ts` sudah memetakan host via
`--host-resolver-rules` (tanpa menyentuh `/etc/hosts`).

Membuat data tenant uji: login SuperAdmin → `/admin/tenants` → daftarkan RT dengan
slug `rt-003` (subdomain otomatis) atau custom domain `rt01.perumahan.com`.

---

## 5. Catatan Produksi

- **DNS**: buat record wildcard `*.domainapp.com → server` agar subdomain tenant baru
  langsung hidup tanpa operasional DNS manual.
- **TLS**: wildcard certificate (`*.domainapp.com`) via Traefik/ACME (DNS challenge).
  Custom domain per tenant butuh sertifikat per-domain (ACME HTTP/SNI challenge) —
  pastikan pemilik tenant mempointing CNAME/A record ke server.
- **VAPID/push, share card, dan broadcast** memakai URL relatif — aman untuk hostname
  mana pun.
- Root domain produksi saat ini melayani **tenant default**. Landing platform
  (direktori RT) di root adalah kandidat iterasi berikutnya; subdomain `admin.`
  di-reserve bila admin app ingin dipisah ke hostname sendiri.
