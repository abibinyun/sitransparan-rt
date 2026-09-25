-- Migration: 000046_fix_poll_votes_unique_index_for_scope.up.sql
-- Pada mode 1 Warga 1 Suara (resident_id IS NOT NULL), beberapa warga dari rumah yang sama (house_id sama)
-- boleh sama-sama memberikan suara. Oleh karena itu, indeks unik uq_poll_house_vote hanya boleh aktif
-- jika resident_id IS NULL (khusus mode 1 Rumah 1 Suara).

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Lepas FK constraint poll_votes_resident_id_fkey jika ada agar mengizinkan anggota keluarga dari family_members
        EXECUTE format('
            DO $c$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''poll_votes_resident_id_fkey'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.poll_votes DROP CONSTRAINT poll_votes_resident_id_fkey;
                END IF;
            END $c$;
        ', schema_name, schema_name);

        -- 2. Drop unique index lama uq_poll_house_vote
        EXECUTE format('DROP INDEX IF EXISTS %I.uq_poll_house_vote;', schema_name);

        -- 3. Buat ulang conditional unique index: 1 Rumah = 1 Suara hanya berlaku jika resident_id IS NULL
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_house_vote 
            ON %I.poll_votes (poll_id, house_id) 
            WHERE house_id IS NOT NULL AND resident_id IS NULL;
        ', schema_name);

    END LOOP;
END $$;
