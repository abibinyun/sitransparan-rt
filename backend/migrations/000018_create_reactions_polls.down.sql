-- Migration: 000018_create_reactions_polls.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('DROP TABLE IF EXISTS %I.poll_votes;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.polls;', schema_name);
        EXECUTE format('DROP TABLE IF EXISTS %I.reactions;', schema_name);
    END LOOP;
END $$;
