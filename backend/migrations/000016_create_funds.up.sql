-- Migration 000016: Add funds (multi-fund accounting) to tenant schemas and public schema
CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'operational', -- 'operational', 'social', 'youth', 'infrastructure', 'other'
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Loop through all existing tenant schemas and create funds table + add fund_id to financial_transactions
DO $$
DECLARE
    t RECORD;
    s TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        s := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.funds (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'operational',
                description TEXT,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        $ddl$, s);

        -- Add fund_id column to financial_transactions if not exists
        EXECUTE format($ddl$
            ALTER TABLE %I.financial_transactions 
            ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES %I.funds(id) ON DELETE SET NULL;
        $ddl$, s, s);

        -- Seed default 'Kas Utama RT' fund for the tenant if no funds exist
        EXECUTE format($ddl$
            INSERT INTO %I.funds (id, tenant_id, name, type, description, is_default, created_at, updated_at)
            SELECT gen_random_uuid(), $1, 'Kas Utama RT', 'operational', 'Kas operasional umum RT', TRUE, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM %I.funds WHERE tenant_id = $1);
        $ddl$, s, s) USING t.id;

        -- Seed 'Kas Karang Taruna' & 'Dana Sosial'
        EXECUTE format($ddl$
            INSERT INTO %I.funds (id, tenant_id, name, type, description, is_default, created_at, updated_at)
            SELECT gen_random_uuid(), $1, 'Kas Karang Taruna', 'youth', 'Kas pemuda dan kegiatan 17-an', FALSE, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM %I.funds WHERE tenant_id = $1 AND name = 'Kas Karang Taruna');
        $ddl$, s, s) USING t.id;

        EXECUTE format($ddl$
            INSERT INTO %I.funds (id, tenant_id, name, type, description, is_default, created_at, updated_at)
            SELECT gen_random_uuid(), $1, 'Dana Sosial & Kematian', 'social', 'Dana santunan warga sakit / duka', FALSE, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM %I.funds WHERE tenant_id = $1 AND name = 'Dana Sosial & Kematian');
        $ddl$, s, s) USING t.id;

        -- Backfill existing transactions with default fund_id
        EXECUTE format($ddl$
            UPDATE %I.financial_transactions ft
            SET fund_id = f.id
            FROM %I.funds f
            WHERE ft.fund_id IS NULL AND f.tenant_id = ft.tenant_id AND f.is_default = TRUE;
        $ddl$, s, s);
    END LOOP;
END $$;
