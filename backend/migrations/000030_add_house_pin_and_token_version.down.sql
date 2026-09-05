-- Migration 000030: Revert pin_code and token_version from houses
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE IF EXISTS %I.houses 
            DROP COLUMN IF EXISTS pin_code,
            DROP COLUMN IF EXISTS token_version;
        ', schema_name);
    END LOOP;
END $$;
