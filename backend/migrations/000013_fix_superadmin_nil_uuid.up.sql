-- 000013: Fix superadmin@platform.local seeded with a nil UUID.
--
-- Migration 000001 seeded the platform superadmin with id
-- '00000000-0000-0000-0000-000000000000' (uuid.Nil). The auth middleware
-- rejects tokens whose user_id is nil, so this account could authenticate but
-- every authenticated request failed with 401. Assign a valid UUID and update
-- the tenant_users mapping that references it.

DO $$
DECLARE
    old_id uuid := '00000000-0000-0000-0000-000000000000';
    new_id uuid := '00000000-0000-0000-0000-000000000008';
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE id = old_id AND email = 'superadmin@platform.local') THEN
        -- Re-point the tenant_users mapping (FK references users.id).
        ALTER TABLE tenant_users DROP CONSTRAINT tenant_users_user_id_fkey;
        UPDATE tenant_users SET user_id = new_id WHERE user_id = old_id;
        UPDATE users SET id = new_id WHERE id = old_id AND email = 'superadmin@platform.local';
        ALTER TABLE tenant_users
            ADD CONSTRAINT tenant_users_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
