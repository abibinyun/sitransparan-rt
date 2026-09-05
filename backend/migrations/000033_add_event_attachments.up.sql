-- Migration 000033: Add attachment_url and report_url to events
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('ALTER TABLE IF EXISTS %I.events ADD COLUMN IF NOT EXISTS attachment_url TEXT;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.events ADD COLUMN IF NOT EXISTS report_url TEXT;', schema_name);
    END LOOP;
END $$;
