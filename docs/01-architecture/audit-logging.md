---
title: "Audit Logging Architecture"
description: "Pencatatan rekam jejak aktivitas administratif dan integritas audit trail"
tags:
  - architecture
  - security
  - audit-logging
---

# 📜 Audit Logging Architecture

Untuk menjamin akuntabilitas kepengurusan RT dan mencegah manipulasi data, seluruh aktivitas administratif sensitif dicatat ke dalam tabel audit terpusat.

---

## 1. Lokasi Tabel & Skema Audit

Tabel audit disimpan di dalam skema katalog global:
```sql
-- public.audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
```

---

## 2. Aktivitas yang Wajib Dicatat (Audited Events)

1. **Keuangan & Kas**:
   - `FEE_CATEGORY_CREATED`, `FEE_CATEGORY_UPDATED`
   - `DUES_PAYMENT_RECORDED`, `DUES_PAYMENT_VERIFIED`
   - `EXPENSE_RECORDED`, `EXPENSE_APPROVED`
   - `FUND_CREATED`, `FUND_TRANSFERRED`
2. **Kependudukan**:
   - `RESIDENT_CREATED`, `RESIDENT_APPROVED`, `RESIDENT_REJECTED`
   - `HOUSE_ASSIGNED`
3. **Pemerintahan & Notulen**:
   - `MEETING_CREATED`, `DECISION_RECORDED`, `ACTION_ITEM_ASSIGNED`
4. **Platform (Superadmin)**:
   - `TENANT_CREATED`, `TENANT_DEACTIVATED`
   - `USER_ROLE_ASSIGNED`

---

## 3. Immutability & Perlindungan Log

- Tabel `public.audit_logs` bersifat **append-only**.
- Tidak ada endpoint API atau repository query yang menyediakan operasi `UPDATE` atau `DELETE` pada tabel ini.
- Hak akses database untuk user aplikasi tidak mengizinkan pemotongan tabel (`TRUNCATE`).

---

## 4. Hubungan Lintas Dokumen

- [[01-architecture/system-overview|Kembali ke System Overview]]
- [[01-architecture/authentication-and-rbac|Autentikasi & RBAC]]
- [[03-database/schema-inventory|Katalog Skema Database]]
- [[00-MOC|Kembali ke MOC]]
