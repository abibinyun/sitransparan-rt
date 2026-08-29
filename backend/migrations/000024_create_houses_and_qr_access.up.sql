-- 000024_create_houses_and_qr_access.up.sql
-- Create houses table and link residents, poll votes, aspirations to houses for zero-friction QR access

DO $$
DECLARE
    t_record RECORD;
    schema_name TEXT;
BEGIN
    FOR t_record IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t_record.slug, '-', '_');

        -- Create houses table in tenant schema
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.houses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                block_number VARCHAR(50) NOT NULL,
                address TEXT,
                head_resident_id UUID,
                access_token VARCHAR(64) UNIQUE NOT NULL,
                token_status VARCHAR(20) DEFAULT ''active'' CHECK (token_status IN (''active'', ''revoked'', ''suspended'')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        ', schema_name);

        -- Add house_id to residents table
        EXECUTE format('
            ALTER TABLE %I.residents ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES %I.houses(id) ON DELETE SET NULL;
        ', schema_name, schema_name);

        -- Foreign key head_resident_id to residents
        EXECUTE format('
            DO $fk$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = ''fk_houses_head_resident'' AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.houses ADD CONSTRAINT fk_houses_head_resident FOREIGN KEY (head_resident_id) REFERENCES %I.residents(id) ON DELETE SET NULL;
                END IF;
            END $fk$;
        ', schema_name, schema_name, schema_name);

        -- Link poll_votes to house_id for 1 House = 1 Vote anti-duplicate enforcement
        EXECUTE format('
            ALTER TABLE %I.poll_votes ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES %I.houses(id) ON DELETE CASCADE;
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_house_vote ON %I.poll_votes(poll_id, house_id) WHERE house_id IS NOT NULL;
        ', schema_name, schema_name, schema_name);

        -- Link aspirations to house_id for transparent neighborhood identification
        EXECUTE format('
            ALTER TABLE %I.aspirations ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES %I.houses(id) ON DELETE SET NULL;
        ', schema_name, schema_name);
    END LOOP;
END $$;
