-- Migration: 000044_add_resident_id_to_tenant_users.down.sql

DO $$
BEGIN
    DROP INDEX IF EXISTS public.idx_tenant_users_resident_id;
    ALTER TABLE public.tenant_users DROP COLUMN IF EXISTS resident_id;
END $$;
