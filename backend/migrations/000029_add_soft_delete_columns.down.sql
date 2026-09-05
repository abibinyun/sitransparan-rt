-- Rollback Migration 000029
DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE IF EXISTS public.tenants DROP COLUMN IF EXISTS deleted_at;

    FOR t IN SELECT id, slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_residents_deleted_at;', schema_name, replace(t.slug, '-', '_'));
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_financial_transactions_deleted_at;', schema_name, replace(t.slug, '-', '_'));

        EXECUTE format('ALTER TABLE IF EXISTS %I.residents DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.family_members DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.houses DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.house_residents DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.funds DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.fee_categories DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.dues_payments DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.financial_transactions DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.events DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_budgets DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_participants DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_sponsors DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_roles DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.event_receipts DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.aspirations DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.community_needs DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.announcements DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.documents DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.meetings DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.meeting_attendees DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.meeting_decisions DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.meeting_action_items DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.polls DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.karang_taruna_periods DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.karang_taruna_members DROP COLUMN IF EXISTS deleted_at;', schema_name);

        EXECUTE format('ALTER TABLE IF EXISTS %I.waste_categories DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.waste_deposits DROP COLUMN IF EXISTS deleted_at;', schema_name);
        EXECUTE format('ALTER TABLE IF EXISTS %I.waste_deposit_items DROP COLUMN IF EXISTS deleted_at;', schema_name);
    END LOOP;
END $$;
