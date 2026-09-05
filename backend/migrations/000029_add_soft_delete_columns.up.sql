-- Migration 000029: Add deleted_at to all main tables (soft-delete architecture)
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    -- 1. Global / Public tables
    ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
    ALTER TABLE IF EXISTS public.tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

    -- 2. Tenant schemas
    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- Core demographic & housing
        EXECUTE format('ALTER TABLE IF EXISTS %I.residents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.family_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.houses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.house_residents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Financials & Funds
        EXECUTE format('ALTER TABLE IF EXISTS %I.funds ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.fee_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.dues_payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.financial_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Events
        EXECUTE format('ALTER TABLE IF EXISTS %I.events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_sponsors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_receipts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Aspirations, Needs, Announcements, Documents
        EXECUTE format('ALTER TABLE IF EXISTS %I.aspirations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.community_needs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Meetings
        EXECUTE format('ALTER TABLE IF EXISTS %I.meetings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.meeting_attendees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.meeting_decisions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.meeting_action_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Polls
        EXECUTE format('ALTER TABLE IF EXISTS %I.polls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Karang Taruna
        EXECUTE format('ALTER TABLE IF EXISTS %I.karang_taruna_periods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.karang_taruna_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Bank Sampah
        EXECUTE format('ALTER TABLE IF EXISTS %I.waste_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.waste_deposits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.waste_deposit_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;', schema_name);

        -- Buat partial index untuk performa query soft-delete
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_residents_deleted_at ON %I.residents (deleted_at);', replace(t.slug, '-', '_'), schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_financial_transactions_deleted_at ON %I.financial_transactions (deleted_at);', replace(t.slug, '-', '_'), schema_name);
    END LOOP;
END $$;
