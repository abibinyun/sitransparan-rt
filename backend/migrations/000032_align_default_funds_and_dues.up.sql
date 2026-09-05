-- Migration 000032: Align default financial seeds (Kas RT only for funds, Iuran Sampah for dues)
DO $$
DECLARE
    t RECORD;
    s TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        s := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Rename 'Kas Utama RT' to 'Kas RT'
        EXECUTE format($ddl$
            UPDATE %I.funds
            SET name = 'Kas RT', description = 'Kas operasional umum RT', updated_at = NOW()
            WHERE name = 'Kas Utama RT' AND tenant_id = $1;
        $ddl$, s) USING t.id;

        -- 2. Ensure default fund 'Kas RT' exists if missing
        EXECUTE format($ddl$
            INSERT INTO %I.funds (id, tenant_id, name, type, description, is_default, created_at, updated_at)
            SELECT gen_random_uuid(), $1, 'Kas RT', 'operational', 'Kas operasional umum RT', TRUE, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM %I.funds WHERE tenant_id = $1 AND is_default = TRUE);
        $ddl$, s, s) USING t.id;

        -- 3. Clean up other default seed funds if they have NO transactions associated
        EXECUTE format($ddl$
            DELETE FROM %I.funds
            WHERE tenant_id = $1
              AND is_default = FALSE
              AND name IN ('Kas Karang Taruna', 'Dana Sosial & Kematian', 'Kas Sarana & Pembangunan')
              AND NOT EXISTS (
                  SELECT 1 FROM %I.financial_transactions WHERE fund_id = %I.funds.id
              );
        $ddl$, s, s, s) USING t.id;

        -- 4. Seed default fee category 'Iuran Sampah' (Rp 25.000 / month)
        EXECUTE format($ddl$
            INSERT INTO %I.fee_categories (id, tenant_id, name, amount, period, description, created_at, updated_at)
            SELECT gen_random_uuid(), $1, 'Iuran Sampah', 25000.00, 'monthly', 'Iuran kebersihan & pengelolaan sampah RT', NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM %I.fee_categories WHERE tenant_id = $1 AND name = 'Iuran Sampah');
        $ddl$, s, s) USING t.id;

        -- 5. Clean up old unused seed 'Iuran Warga' IF it has NO dues payments
        EXECUTE format($ddl$
            DELETE FROM %I.fee_categories
            WHERE tenant_id = $1
              AND name = 'Iuran Warga'
              AND NOT EXISTS (
                  SELECT 1 FROM %I.dues_payments WHERE fee_category_id = %I.fee_categories.id
              );
        $ddl$, s, s, s) USING t.id;

    END LOOP;
END $$;
