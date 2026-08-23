-- Migration: 000017_create_meetings.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            DROP TABLE IF EXISTS %I.meeting_action_items CASCADE;
            DROP TABLE IF EXISTS %I.meeting_decisions CASCADE;
            DROP TABLE IF EXISTS %I.meeting_attendees CASCADE;
            DROP TABLE IF EXISTS %I.meetings CASCADE;
        ', schema_name, schema_name, schema_name, schema_name);
    END LOOP;
END $$;
