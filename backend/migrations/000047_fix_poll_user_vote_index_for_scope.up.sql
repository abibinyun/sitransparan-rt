-- Migration: 000047_fix_poll_user_vote_index_for_scope.up.sql
-- Pada mode 1 Warga 1 Suara (resident_id IS NOT NULL), sesi QR rumah memiliki user_id yang sama untuk 1 rumah.
-- Oleh karena itu, unique index uq_poll_user_vote juga hanya boleh aktif jika resident_id IS NULL.

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Drop unique index uq_poll_user_vote
        EXECUTE format('DROP INDEX IF EXISTS %I.uq_poll_user_vote;', schema_name);

        -- 2. Buat ulang conditional unique index: user_id hanya unik jika resident_id IS NULL
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_user_vote 
            ON %I.poll_votes (poll_id, user_id) 
            WHERE user_id IS NOT NULL AND resident_id IS NULL;
        ', schema_name);

    END LOOP;
END $$;
