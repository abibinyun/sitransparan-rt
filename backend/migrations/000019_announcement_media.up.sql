-- Migration: 000019_announcement_media.up.sql
-- Galeri foto pengumuman (Fase 2): daftar URL foto per pengumuman.
-- Foto hanya tayang publik jika pengumuman itu sendiri publik (target='all').

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');
        EXECUTE format('
            ALTER TABLE %I.announcements
            ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT ''[]''::jsonb;
        ', schema_name);
    END LOOP;
END $$;

-- Tabel KPI ringan (skema publik, lintas tenant) — konsep portal §4.
CREATE TABLE IF NOT EXISTS portal_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_slug VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- reaction_given | vote_cast | share_opened | feed_view
    target_id UUID,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_events_type_time
    ON portal_events (tenant_slug, event_type, created_at DESC);
