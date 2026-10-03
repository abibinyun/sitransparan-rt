---
title: "Multi-Tenancy Model & Schema Isolation"
description: "Model isolasi multi-tenant PostgreSQL schema-per-tenant pada SiTransparan RT/RW"
tags:
  - architecture
  - multi-tenancy
  - database
  - security
---

# 🏢 Multi-Tenancy Model & Schema Isolation

SiTransparan RT/RW mengimplementasikan arsitektur **Schema-per-Tenant** pada **PostgreSQL 16**. Model ini memberikan jaminan isolasi data tingkat tinggi antar RT tanpa kompleksitas pengelolaan database terpisah (database-per-tenant).

---

## 1. Topologi Skema PostgreSQL

```text
PostgreSQL Cluster: sitransparan_db
├── public (Global Catalog Schema)
│   ├── tenants
│   ├── users
│   ├── roles
│   ├── tenant_users
│   ├── audit_logs
│   ├── push_subscriptions
│   └── portal_events
│
├── tenant_rt_001 (Schema RT 01)
│   ├── residents, family_members, houses, house_residents
│   ├── funds, fee_categories, dues_payments, financial_transactions
│   ├── waste_categories, waste_deposits, waste_deposit_items
│   ├── karang_taruna_periods, karang_taruna_members
│   └── ... (27+ tabel operasional RT)
│
└── tenant_sitransparan_rt (Schema RT Default)
    └── ... (27+ tabel operasional RT)
```

---

## 2. Aturan Konvensi Penamaan Skema

- Setiap tenant memiliki field `slug` unik pada tabel `public.tenants` (misal: `rt-003-sukamaju`).
- Nama skema PostgreSQL ditransformasi secara deterministik:
  $$\text{schema\_name} = \text{"tenant\_"} + \text{replace}(slug, "-", "\_")$$
  *Contoh:* Slug `rt-003` menjadi skema `tenant_rt_003`.

---

## 3. Resolusi Skema pada Kode Sumber Go

Aplikasi **TIDAK MENGGUNAKAN** perintah `SET search_path` pada runtime koneksi karena rentan terhadap race condition pada koneksi database pooling (`pgxpool` / `database/sql`).

Sebagai gantinya, seluruh query di lapisan repository menggunakan helper eksplisit:
```go
// Helper pada backend/internal/repository/helper.go
func TenantTable(ctx context.Context, table string) string {
    tenant := domain.TenantFromContext(ctx)
    if tenant == nil || tenant.Slug == "" {
        return table // fallback default
    }
    safeSlug := strings.ReplaceAll(tenant.Slug, "-", "_")
    return fmt.Sprintf("tenant_%s.%s", safeSlug, table)
}
```

Contoh pemanggilan SQL di repository:
```go
query := fmt.Sprintf(`
    SELECT id, name, balance 
    FROM %s 
    WHERE is_active = true`, 
    TenantTable(ctx, "funds"))
```

---

## 4. Siklus Hidup Tenant (Lifecycle)

### A. Auto-Provisioning saat Pembuatan Tenant
Saat `superadmin` membuat tenant baru via `POST /api/v1/superadmin/tenants`:
1. Record baru disimpan di `public.tenants` dengan status `active`.
2. Backend mengeksekusi DDL template skema (`CREATE SCHEMA tenant_<slug>`).
3. Seluruh tabel operasional (27+ tabel) beserta foreign keys dan indeks dibuat secara otomatis di dalam skema baru.
4. Kantong kas default (`Kas Utama RT`) dan kategori iuran dasar di-seed ke skema baru.

### B. Soft-Delete dan Proteksi Data
Penghapusan tenant tidak pernah menghapus skema PostgreSQL secara fisik (`DROP SCHEMA` tidak diizinkan):
- Endpoint `DELETE /api/v1/superadmin/tenants/{id}` melakukan update:
  ```sql
  UPDATE public.tenants 
  SET status = 'inactive', deleted_at = NOW() 
  WHERE id = $1;
  ```
- Tenant non-aktif langsung ditolak oleh `TenantMiddleware` dan seluruh endpoint publik (HTTP 404/403).
- Data historis warga dan keuangan tetap aman untuk keperluan audit hukum.

---

## 5. Hubungan Lintas Dokumen

- [[01-architecture/system-overview|Kembali ke System Overview]]
- [[01-architecture/subdomain-and-routing|Routing Subdomain & Hostname Matching]]
- [[03-database/schema-inventory|Katalog Skema & Tabel Lengkap]]
- [[00-MOC|Kembali ke MOC]]
