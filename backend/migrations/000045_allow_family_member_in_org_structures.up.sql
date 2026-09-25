-- Migration: 000045_allow_family_member_in_org_structures.up.sql
-- Mengizinkan resident_id di karang_taruna_members dan rt_members merujuk ke tabel family_members
-- dengan melepas hard FK ke residents(id) agar anggota keluarga/anak bisa langsung menjadi pengurus resmi

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        -- 1. Lepas FK constraint karang_taruna_members_resident_id_fkey
        EXECUTE format('
            DO $c$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''karang_taruna_members_resident_id_fkey'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.karang_taruna_members DROP CONSTRAINT karang_taruna_members_resident_id_fkey;
                END IF;
            END $c$;
        ', schema_name, schema_name);

        -- 2. Lepas FK constraint rt_members_resident_id_fkey
        EXECUTE format('
            DO $c$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = ''rt_members_resident_id_fkey'' 
                    AND connamespace = %L::regnamespace
                ) THEN
                    ALTER TABLE %I.rt_members DROP CONSTRAINT rt_members_resident_id_fkey;
                END IF;
            END $c$;
        ', schema_name, schema_name);

    END LOOP;
END $$;
