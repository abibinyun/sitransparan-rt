-- 000031_allow_house_poll_voting.up.sql
-- Izinkan sesi QR Rumah (house_id) untuk memberikan suara di jajak pendapat (poll_votes)
-- dan memberi reaksi (reactions) tanpa foreign key wajib ke users(id).

DO $$
DECLARE
    t_record RECORD;
    schema_name TEXT;
BEGIN
    FOR t_record IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t_record.slug, '-', '_');

        -- 1. Tabel poll_votes:
        -- Jadikan user_id NULLABLE agar suara berbasis rumah (house_id) valid tanpa user akun
        EXECUTE format('ALTER TABLE %I.poll_votes ALTER COLUMN user_id DROP NOT NULL;', schema_name);

        -- Hapus constraint UNIQUE (poll_id, user_id) jika ada
        EXECUTE format('
            DO $c$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''poll_votes_poll_id_user_id_key'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.poll_votes DROP CONSTRAINT poll_votes_poll_id_user_id_key;
                END IF;
            END $c$;
        ', schema_name, schema_name);

        -- Gantikan dengan conditional unique index untuk user_id (1 warga login = 1 suara)
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_user_vote 
            ON %I.poll_votes (poll_id, user_id) 
            WHERE user_id IS NOT NULL;
        ', schema_name);

        -- Pastikan index 1 Rumah = 1 Suara aktif
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_house_vote 
            ON %I.poll_votes (poll_id, house_id) 
            WHERE house_id IS NOT NULL;
        ', schema_name);

        -- Pastikan salah satu dari user_id atau house_id harus terisi
        EXECUTE format('
            DO $c$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''chk_poll_vote_voter'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.poll_votes ADD CONSTRAINT chk_poll_vote_voter 
                    CHECK (user_id IS NOT NULL OR house_id IS NOT NULL);
                END IF;
            END $c$;
        ', schema_name, schema_name);

        -- 2. Tabel reactions:
        -- Tambahkan house_id dan buat user_id nullable agar warga sesi QR juga bisa memberi reaksi/dukungan
        EXECUTE format('ALTER TABLE %I.reactions ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES %I.houses(id) ON DELETE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.reactions ALTER COLUMN user_id DROP NOT NULL;', schema_name);

        EXECUTE format('
            DO $c$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''reactions_target_type_target_id_user_id_key'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.reactions DROP CONSTRAINT reactions_target_type_target_id_user_id_key;
                END IF;
            END $c$;
        ', schema_name, schema_name);

        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_target_user 
            ON %I.reactions (target_type, target_id, user_id) 
            WHERE user_id IS NOT NULL;
        ', schema_name);

        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_target_house 
            ON %I.reactions (target_type, target_id, house_id) 
            WHERE house_id IS NOT NULL;
        ', schema_name);

        EXECUTE format('
            DO $c$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''chk_reactions_actor'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.reactions ADD CONSTRAINT chk_reactions_actor 
                    CHECK (user_id IS NOT NULL OR house_id IS NOT NULL);
                END IF;
            END $c$;
        ', schema_name, schema_name);

    END LOOP;
END $$;
