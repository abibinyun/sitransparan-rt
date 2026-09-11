-- Migration: 000034_announcement_file_urls.up.sql
-- Multi-file lampiran dokumen (PDF/arsip) dan multi-gambar pengumuman warga.

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.announcements
            ADD COLUMN IF NOT EXISTS file_urls JSONB NOT NULL DEFAULT ''[]''::jsonb;
        ', schema_name);
    END LOOP;
END $$;
