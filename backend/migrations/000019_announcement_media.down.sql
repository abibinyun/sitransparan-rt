-- Migration: 000019_announcement_media.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('ALTER TABLE %I.announcements DROP COLUMN IF EXISTS media_urls;', schema_name);
    END LOOP;
END $$;

DROP TABLE IF EXISTS portal_events;
