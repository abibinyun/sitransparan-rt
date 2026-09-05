-- Migration: 000035_add_aspiration_author_and_responder.up.sql
-- Tambah author_name (nama pembuat) dan responder_name (nama penanggap) pada aspirasi warga.

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.aspirations
            ADD COLUMN IF NOT EXISTS author_name VARCHAR(255) NOT NULL DEFAULT ''Warga RT'',
            ADD COLUMN IF NOT EXISTS responder_name VARCHAR(255) NULL;
        ', schema_name);
    END LOOP;
END $$;
