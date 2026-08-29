-- Migration 000027: Rollback Waste Bank tables
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('DROP TABLE IF EXISTS %I.waste_deposit_items CASCADE;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.waste_deposits CASCADE;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.waste_categories CASCADE;', schema_name);
    END LOOP;
END $$;
