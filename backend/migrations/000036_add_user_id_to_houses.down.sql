-- Rollback Migration 000036
DO $$
DECLARE
    t_record RECORD;
    schema_name TEXT;
BEGIN
    FOR t_record IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t_record.slug, '-', '_');

        EXECUTE format('
            DROP INDEX IF EXISTS %I.idx_houses_user_id;
            ALTER TABLE %I.houses DROP COLUMN IF EXISTS user_id;
        ', schema_name, schema_name);
    END LOOP;
END $$;
