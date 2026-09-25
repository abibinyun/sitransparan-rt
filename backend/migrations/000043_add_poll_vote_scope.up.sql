-- Migration: 000043_add_poll_vote_scope.up.sql
-- Menambahkan vote_scope ('house' | 'resident') pada tabel polls
-- dan resident_id pada tabel poll_votes untuk mendukung 1 Orang = 1 Suara

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Tambah vote_scope pada tabel polls
        EXECUTE format('
            ALTER TABLE %I.polls
            ADD COLUMN IF NOT EXISTS vote_scope VARCHAR(20) NOT NULL DEFAULT ''house''
            CHECK (vote_scope IN (''house'', ''resident''));
        ', schema_name);

        -- 2. Tambah resident_id pada tabel poll_votes
        EXECUTE format('
            ALTER TABLE %I.poll_votes
            ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES %I.residents(id) ON DELETE CASCADE;
        ', schema_name, schema_name);

        -- 3. Unique index per resident_id (1 warga = 1 suara)
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_resident_vote
            ON %I.poll_votes (poll_id, resident_id)
            WHERE resident_id IS NOT NULL;
        ', schema_name);

        -- 4. Perbarui check constraint voter: user_id, house_id, atau resident_id
        EXECUTE format('
            DO $c$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''chk_poll_vote_voter'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.poll_votes DROP CONSTRAINT chk_poll_vote_voter;
                END IF;
                ALTER TABLE %I.poll_votes ADD CONSTRAINT chk_poll_vote_voter 
                CHECK (user_id IS NOT NULL OR house_id IS NOT NULL OR resident_id IS NOT NULL);
            END $c$;
        ', schema_name, schema_name, schema_name);

    END LOOP;
END $$;
