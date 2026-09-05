-- 000031_allow_house_poll_voting.down.sql
DO $$
DECLARE
    t_record RECORD;
    schema_name TEXT;
BEGIN
    FOR t_record IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t_record.slug, '-', '_');

        EXECUTE format('
            DELETE FROM %I.reactions WHERE user_id IS NULL;
            ALTER TABLE %I.reactions DROP CONSTRAINT IF EXISTS chk_reactions_actor;
            DROP INDEX IF EXISTS %I.uq_reactions_target_house;
            DROP INDEX IF EXISTS %I.uq_reactions_target_user;
            ALTER TABLE %I.reactions DROP COLUMN IF EXISTS house_id;
            ALTER TABLE %I.reactions ALTER COLUMN user_id SET NOT NULL;
            ALTER TABLE %I.reactions ADD CONSTRAINT reactions_target_type_target_id_user_id_key UNIQUE (target_type, target_id, user_id);
        ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);

        EXECUTE format('
            DELETE FROM %I.poll_votes WHERE user_id IS NULL;
            ALTER TABLE %I.poll_votes DROP CONSTRAINT IF EXISTS chk_poll_vote_voter;
            DROP INDEX IF EXISTS %I.uq_poll_user_vote;
            ALTER TABLE %I.poll_votes ALTER COLUMN user_id SET NOT NULL;
            ALTER TABLE %I.poll_votes ADD CONSTRAINT poll_votes_poll_id_user_id_key UNIQUE (poll_id, user_id);
        ', schema_name, schema_name, schema_name, schema_name, schema_name);
    END LOOP;
END $$;
