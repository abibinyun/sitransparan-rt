-- Migration: 000043_add_poll_vote_scope.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('DROP INDEX IF EXISTS %I.uq_poll_resident_vote;', schema_name);
        EXECUTE format('ALTER TABLE %I.poll_votes DROP COLUMN IF EXISTS resident_id;', schema_name);
        EXECUTE format('ALTER TABLE %I.polls DROP COLUMN IF EXISTS vote_scope;', schema_name);
    END LOOP;
END $$;
