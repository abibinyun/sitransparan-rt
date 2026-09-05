-- Migration 000036: Add user_id column to houses table in each tenant schema
DO $$
DECLARE
    t_record RECORD;
    schema_name TEXT;
BEGIN
    FOR t_record IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t_record.slug, '-', '_');

        EXECUTE format('
            ALTER TABLE %I.houses
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_houses_user_id ON %I.houses(user_id);
        ', schema_name);
    END LOOP;
END $$;
