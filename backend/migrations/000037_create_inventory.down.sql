-- Migration: 000037_create_inventory.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            DROP TABLE IF EXISTS %I.inventory_borrowings CASCADE;
            DROP TABLE IF EXISTS %I.inventory_items CASCADE;
        ', schema_name, schema_name);
    END LOOP;
END $$;
