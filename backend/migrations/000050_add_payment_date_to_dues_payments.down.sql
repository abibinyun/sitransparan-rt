-- Migration: 000050_add_payment_date_to_dues_payments.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            DROP INDEX IF EXISTS %I.idx_%s_dues_payment_date;
        ', schema_name, replace(t.slug, '-', '_'));

        EXECUTE format('
            ALTER TABLE IF EXISTS %I.dues_payments DROP COLUMN IF EXISTS payment_date;
        ', schema_name);
    END LOOP;
END $$;
