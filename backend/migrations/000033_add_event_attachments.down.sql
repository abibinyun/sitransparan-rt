-- Migration 000033: Add attachment_url and report_url to events (down)
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('ALTER TABLE IF EXISTS %I.events DROP COLUMN IF EXISTS attachment_url;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.events DROP COLUMN IF EXISTS report_url;', schema_name);
    END LOOP;
END $$;
