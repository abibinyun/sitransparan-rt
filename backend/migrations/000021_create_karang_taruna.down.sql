DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('DROP TABLE IF EXISTS %I.karang_taruna_members CASCADE;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.karang_taruna_configs CASCADE;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.karang_taruna_periods CASCADE;', schema_name);
    END LOOP;
END $$;
