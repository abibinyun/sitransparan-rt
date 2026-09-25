-- Migration: 000047_fix_poll_user_vote_index_for_scope.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('DROP INDEX IF EXISTS %I.uq_poll_user_vote;', schema_name);
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_user_vote 
            ON %I.poll_votes (poll_id, user_id) 
            WHERE user_id IS NOT NULL;
        ', schema_name);
    END LOOP;
END $$;
