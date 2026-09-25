-- Migration: 000042_create_rt_structure.up.sql
-- Struktur Pengurus RT/RW: masa bakti resmi, SK pengangkatan, dan struktur jabatan pengurus inti & seksi bidang.

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Periode / Masa Bakti Kepengurusan RT
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.rt_periods (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                name VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT ''draft'' CHECK (status IN (''draft'', ''active'', ''archived'')),
                sk_number VARCHAR(100),
                sk_file_url TEXT,
                created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ NULL
            );', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_rt_periods_status
            ON %I.rt_periods (tenant_id, status);',
            replace(t.slug, '-', '_'), schema_name);

        -- 2. Anggota / Pejabat Struktur Kepengurusan RT
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.rt_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                period_id UUID NOT NULL REFERENCES %I.rt_periods(id) ON DELETE CASCADE,
                resident_id UUID NOT NULL REFERENCES %I.residents(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL DEFAULT ''seksi'', -- ketua, wakil, sekretaris, bendahara, seksi, penasihat
                section VARCHAR(100), -- Keamanan, Kebersihan & Lingkungan, Sosial & Humas, Kerohanian, Pembangunan
                custom_title VARCHAR(100), -- Contoh: Ketua RT 03, Koordinator Satpam
                phone_override VARCHAR(50),
                photo_url TEXT,
                status VARCHAR(20) NOT NULL DEFAULT ''aktif'' CHECK (status IN (''aktif'', ''demisioner'', ''nonaktif'')),
                joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ NULL,
                UNIQUE (period_id, resident_id)
            );', schema_name, schema_name, schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_rt_members_role_section
            ON %I.rt_members (period_id, role, section);',
            replace(t.slug, '-', '_'), schema_name);

    END LOOP;
END $$;
