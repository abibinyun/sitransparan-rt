-- Migration 000027: Create Waste Bank (Bank Sampah) tables with Family/Household (KK) & Karang Taruna share
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Waste Categories (Kategori Sampah)
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.waste_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                unit VARCHAR(20) NOT NULL DEFAULT ''kg'',
                price_per_unit NUMERIC(15, 2) NOT NULL DEFAULT 0,
                resident_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
                karang_taruna_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        ', schema_name);

        -- 2. Waste Deposits (Setoran Sampah per KK / Rumah)
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.waste_deposits (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                house_id UUID REFERENCES %I.houses(id) ON DELETE SET NULL,
                resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                kk_number VARCHAR(30),
                family_head_name VARCHAR(255) NOT NULL,
                deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
                total_weight NUMERIC(10, 2) NOT NULL DEFAULT 0,
                total_gross_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                resident_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                karang_taruna_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT ''pending'' CHECK (status IN (''pending'', ''verified'', ''paid_out'', ''cancelled'')),
                notes TEXT,
                recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        ', schema_name, schema_name, schema_name);

        -- 3. Waste Deposit Items (Rincian per jenis sampah)
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.waste_deposit_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                deposit_id UUID NOT NULL REFERENCES %I.waste_deposits(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES %I.waste_categories(id) ON DELETE RESTRICT,
                quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
                unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
                gross_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                resident_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                karang_taruna_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        ', schema_name, schema_name, schema_name);

        -- 4. Seed Standard Waste Categories
        EXECUTE format('
            INSERT INTO %I.waste_categories (id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description)
            SELECT gen_random_uuid(), $1, ''Kardus / Kertas'', ''kg'', 2500, 80.00, 20.00, ''Kardus cokelat tebal dan kertas arsip terpilah''
            WHERE NOT EXISTS (SELECT 1 FROM %I.waste_categories WHERE tenant_id = $1 AND name = ''Kardus / Kertas'');
        ', schema_name, schema_name) USING t.id;

        EXECUTE format('
            INSERT INTO %I.waste_categories (id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description)
            SELECT gen_random_uuid(), $1, ''Botol Plastik PET & Gelas'', ''kg'', 4000, 80.00, 20.00, ''Botol air mineral bersih tanpa tutup/label''
            WHERE NOT EXISTS (SELECT 1 FROM %I.waste_categories WHERE tenant_id = $1 AND name = ''Botol Plastik PET & Gelas'');
        ', schema_name, schema_name) USING t.id;

        EXECUTE format('
            INSERT INTO %I.waste_categories (id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description)
            SELECT gen_random_uuid(), $1, ''Minyak Jelantah (UCO)'', ''liter'', 6500, 85.00, 15.00, ''Minyak goreng bekas pakai yang disaring''
            WHERE NOT EXISTS (SELECT 1 FROM %I.waste_categories WHERE tenant_id = $1 AND name = ''Minyak Jelantah (UCO)'');
        ', schema_name, schema_name) USING t.id;

        EXECUTE format('
            INSERT INTO %I.waste_categories (id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description)
            SELECT gen_random_uuid(), $1, ''Kaleng & Logam'', ''kg'', 7000, 80.00, 20.00, ''Kaleng susu, biskuit, dan aluminium minuman''
            WHERE NOT EXISTS (SELECT 1 FROM %I.waste_categories WHERE tenant_id = $1 AND name = ''Kaleng & Logam'');
        ', schema_name, schema_name) USING t.id;

    END LOOP;
END $$;
