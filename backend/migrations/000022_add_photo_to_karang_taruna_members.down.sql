DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.karang_taruna_members
            DROP COLUMN IF EXISTS photo_url;
        ', schema_name);
    END LOOP;
END $$;
