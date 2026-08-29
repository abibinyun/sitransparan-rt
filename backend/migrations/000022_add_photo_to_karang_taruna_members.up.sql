-- Migration: 000022_add_photo_to_karang_taruna_members.up.sql
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.karang_taruna_members
            ADD COLUMN IF NOT EXISTS photo_url TEXT;
        ', schema_name);
    END LOOP;
END $$;
