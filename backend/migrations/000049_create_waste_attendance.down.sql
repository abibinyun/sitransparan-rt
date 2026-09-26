-- Migration 000049 down
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('DROP TABLE IF EXISTS %I.waste_attendance_members CASCADE;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.waste_attendance CASCADE;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.waste_collectors CASCADE;', schema_name);
    END LOOP;
END $$;
