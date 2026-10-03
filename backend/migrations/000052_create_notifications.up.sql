-- Migration: 000052_create_notifications.up.sql
-- Inisialisasi tabel notifications pada skema dinamis per-tenant

DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
                title VARCHAR(150) NOT NULL,
                body TEXT NOT NULL,
                category VARCHAR(50) NOT NULL,
                action_url VARCHAR(255) NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                read_at TIMESTAMPTZ,
                metadata JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_%s_notifications_user_unread 
            ON %I.notifications(user_id, is_read, created_at DESC);
        ', schema_record.schema_name, schema_record.schema_name, schema_record.schema_name);
    END LOOP;
END $$;
