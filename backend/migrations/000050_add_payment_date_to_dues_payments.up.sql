-- Migration: 000050_add_payment_date_to_dues_payments.up.sql
-- Tambahkan kolom payment_date pada tabel dues_payments di setiap skema tenant

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            ALTER TABLE IF EXISTS %I.dues_payments 
            ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NOW();
        ', schema_name);

        -- Isi data lama jika payment_date masih NULL dengan created_at
        EXECUTE format('
            UPDATE %I.dues_payments 
            SET payment_date = created_at 
            WHERE payment_date IS NULL;
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_dues_payment_date 
            ON %I.dues_payments (payment_date DESC);
        ', replace(t.slug, '-', '_'), schema_name);
    END LOOP;
END $$;
