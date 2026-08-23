-- Migration: 000017_create_meetings.up.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.meetings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                agenda TEXT NOT NULL,
                meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
                location VARCHAR(255) NOT NULL,
                meeting_type VARCHAR(50) NOT NULL DEFAULT ''regular'', -- regular, emergency, karang_taruna, rtrw_pleno
                visibility VARCHAR(50) NOT NULL DEFAULT ''internal'', -- public, internal, confidential
                status VARCHAR(50) NOT NULL DEFAULT ''scheduled'', -- scheduled, ongoing, completed, cancelled
                notes TEXT,
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS %I.meeting_attendees (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                meeting_id UUID NOT NULL REFERENCES %I.meetings(id) ON DELETE CASCADE,
                resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                role_or_title VARCHAR(100) DEFAULT ''Warga'',
                attended BOOLEAN DEFAULT TRUE,
                notes VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS %I.meeting_decisions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                meeting_id UUID NOT NULL REFERENCES %I.meetings(id) ON DELETE CASCADE,
                decision_text TEXT NOT NULL,
                category VARCHAR(100) DEFAULT ''Umum'',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS %I.meeting_action_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                meeting_id UUID NOT NULL REFERENCES %I.meetings(id) ON DELETE CASCADE,
                task TEXT NOT NULL,
                assignee_name VARCHAR(255) NOT NULL,
                assignee_resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                due_date DATE,
                status VARCHAR(50) NOT NULL DEFAULT ''pending'', -- pending, in_progress, completed, cancelled
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_%s_meetings_date ON %I.meetings(meeting_date DESC);
            CREATE INDEX IF NOT EXISTS idx_%s_action_items_status ON %I.meeting_action_items(status);
        ', 
        schema_name, 
        schema_name, schema_name, schema_name,
        schema_name, schema_name,
        schema_name, schema_name, schema_name,
        schema_name, schema_name,
        schema_name, schema_name);
    END LOOP;
END $$;
