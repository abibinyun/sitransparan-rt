-- Migration: 000018_create_reactions_polls.up.sql
-- Fase 3 interaktivitas sosial: reaksi warga-login + polling 1-warga-1-suara.
-- Tabel dibuat di SEMUA schema tenant yang ada; tenant baru mendapat tabel yang
-- sama lewat provisioning di repository (postgres_repos.go).

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.reactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                target_type VARCHAR(50) NOT NULL, -- announcement | event | meeting
                target_id UUID NOT NULL,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                reaction VARCHAR(20) NOT NULL CHECK (reaction IN (''support'', ''like'', ''applause'')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (target_type, target_id, user_id)
            );', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_reactions_target
            ON %I.reactions (target_type, target_id);',
            replace(t.slug, '-', '_'), schema_name);

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.polls (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                question TEXT NOT NULL,
                options JSONB NOT NULL, -- array of strings, 2..6 entri
                status VARCHAR(20) NOT NULL DEFAULT ''open'' CHECK (status IN (''open'', ''closed'')),
                created_by UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                closed_at TIMESTAMPTZ
            );', schema_name);

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.poll_votes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                poll_id UUID NOT NULL REFERENCES %I.polls(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                option_index SMALLINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (poll_id, user_id),
                CHECK (option_index >= 0)
            );', schema_name, schema_name);
    END LOOP;
END $$;
