-- Migration: 000038_create_announcement_comments.up.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Tambah sakelar allow_comments di tabel announcements per-tenant
        EXECUTE format('
            ALTER TABLE %I.announcements
            ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT FALSE;
        ', schema_name);

        -- 2. Buat tabel announcement_comments flat 1 tingkat
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.announcement_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                announcement_id UUID NOT NULL REFERENCES %I.announcements(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                author_name VARCHAR(255) NOT NULL,
                house_block VARCHAR(100),
                content VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );

            CREATE INDEX IF NOT EXISTS idx_announcement_comments_ann ON %I.announcement_comments(announcement_id);
            CREATE INDEX IF NOT EXISTS idx_announcement_comments_user ON %I.announcement_comments(user_id);
            CREATE INDEX IF NOT EXISTS idx_announcement_comments_created ON %I.announcement_comments(created_at DESC);
        ', schema_name, schema_name, schema_name, schema_name, schema_name);
    END LOOP;
END $$;
