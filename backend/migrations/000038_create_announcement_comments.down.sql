-- Migration: 000038_create_announcement_comments.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            DROP TABLE IF EXISTS %I.announcement_comments CASCADE;
            ALTER TABLE %I.announcements DROP COLUMN IF EXISTS allow_comments;
        ', schema_name, schema_name);
    END LOOP;
END $$;
