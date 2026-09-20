-- Migrasi untuk menambahkan kolom category pada tabel announcements di seluruh schema tenant
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    -- 1. Tambah kolom category di tabel announcements di public schema (jika ada)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'announcements'
    ) THEN
        ALTER TABLE public.announcements 
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'pengumuman';
    END IF;

    -- 2. Tambah kolom category di tabel announcements per-tenant
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            ALTER TABLE %I.announcements
            ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT ''pengumuman'';
        ', schema_record.schema_name);
    END LOOP;
END $$;
