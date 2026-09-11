-- Migration: 000034_announcement_file_urls.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.announcements
            DROP COLUMN IF EXISTS file_urls;
        ', schema_name);
    END LOOP;
END $$;
