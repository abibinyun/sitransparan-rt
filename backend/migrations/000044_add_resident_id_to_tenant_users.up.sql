-- Migration: 000044_add_resident_id_to_tenant_users.up.sql
-- Menambahkan resident_id pada tabel tenant_users agar akun login terhubung langsung ke profil warga di tenant tersebut

DO $$
BEGIN
    ALTER TABLE public.tenant_users
    ADD COLUMN IF NOT EXISTS resident_id UUID NULL;

    CREATE INDEX IF NOT EXISTS idx_tenant_users_resident_id
    ON public.tenant_users (tenant_id, resident_id);
END $$;
