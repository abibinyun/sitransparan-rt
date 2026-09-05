-- Migration: 000035_add_aspiration_author_and_responder.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.aspirations
            DROP COLUMN IF EXISTS author_name,
            DROP COLUMN IF EXISTS responder_name;
        ', schema_name);
    END LOOP;
END $$;
