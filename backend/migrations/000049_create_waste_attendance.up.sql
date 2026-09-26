-- Migration: 000049_create_waste_attendance.up.sql
-- Pencatatan absensi dan honorarium penarikan sampah oleh pemuda/petugas RT (Internal)

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Master Petugas Pengambil Sampah (tenant_id dan resident_id tanpa FK ketat lintas skema sampah)
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.waste_collectors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                resident_id UUID,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ NULL
            );', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_waste_collectors_tenant
            ON %I.waste_collectors (tenant_id, is_active) WHERE deleted_at IS NULL;',
            replace(t.slug, '-', '_'), schema_name);

        -- 2. Rekap Absensi Penarikan Sampah
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.waste_attendance (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                date DATE NOT NULL,
                wage_per_person NUMERIC(12,2) NOT NULL DEFAULT 5000,
                total_wage NUMERIC(12,2) NOT NULL DEFAULT 0,
                notes TEXT,
                created_by UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ NULL
            );', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_waste_attendance_date
            ON %I.waste_attendance (tenant_id, date DESC) WHERE deleted_at IS NULL;',
            replace(t.slug, '-', '_'), schema_name);

        -- 3. Detail Anggota yang Hadir per Sesi Absensi
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.waste_attendance_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                attendance_id UUID NOT NULL REFERENCES %I.waste_attendance(id) ON DELETE CASCADE,
                collector_id UUID NOT NULL REFERENCES %I.waste_collectors(id) ON DELETE CASCADE,
                wage_amount NUMERIC(12,2) NOT NULL DEFAULT 5000,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (attendance_id, collector_id)
            );', schema_name, schema_name, schema_name);

    END LOOP;
END $$;
