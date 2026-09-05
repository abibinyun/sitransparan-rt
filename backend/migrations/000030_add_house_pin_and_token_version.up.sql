-- Migration 000030: Add pin_code and token_version to houses for session kill switch and verification
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- pin_code: 4-digit numeric code (e.g. '5821')
        -- token_version: incremental integer for instant JWT session kill switch
        EXECUTE format('
            ALTER TABLE IF EXISTS %I.houses 
            ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10) DEFAULT LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, ''0''),
            ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;
        ', schema_name);
    END LOOP;
END $$;
