-- Migration: 000021_create_karang_taruna.up.sql
-- Modul Karang Taruna: periode kepengurusan dinamis, konfigurasi seksi/jabatan, dan anggota terstruktur.

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Periode Kepengurusan
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.karang_taruna_periods (
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
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_kt_periods_status
            ON %I.karang_taruna_periods (tenant_id, status);',
            replace(t.slug, '-', '_'), schema_name);

        -- 2. Konfigurasi Organisasi per Periode
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.karang_taruna_configs (
                period_id UUID PRIMARY KEY REFERENCES %I.karang_taruna_periods(id) ON DELETE CASCADE,
                allowed_roles JSONB NOT NULL DEFAULT ''["ketua", "wakil", "sekretaris", "bendahara", "koordinator_seksi", "anggota"]''::jsonb,
                allowed_sections JSONB NOT NULL DEFAULT ''["Olahraga & Kebugaran", "Seni & Budaya", "Sosial & Humas", "Kerohanian & Kemitraan", "Lingkungan Hidup"]''::jsonb,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );', schema_name, schema_name);

        -- 3. Anggota & Pengurus per Periode
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.karang_taruna_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                period_id UUID NOT NULL REFERENCES %I.karang_taruna_periods(id) ON DELETE CASCADE,
                resident_id UUID NOT NULL REFERENCES %I.residents(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL DEFAULT ''anggota'',
                section VARCHAR(100),
                custom_title VARCHAR(100),
                phone_override VARCHAR(50),
                status VARCHAR(20) NOT NULL DEFAULT ''aktif'' CHECK (status IN (''aktif'', ''demisioner'', ''nonaktif'')),
                joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (period_id, resident_id)
            );', schema_name, schema_name, schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_kt_members_role_section
            ON %I.karang_taruna_members (period_id, role, section);',
            replace(t.slug, '-', '_'), schema_name);

    END LOOP;
END $$;
