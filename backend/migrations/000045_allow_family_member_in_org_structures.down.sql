-- Migration: 000045_allow_family_member_in_org_structures.down.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            ALTER TABLE %I.karang_taruna_members 
            ADD CONSTRAINT karang_taruna_members_resident_id_fkey 
            FOREIGN KEY (resident_id) REFERENCES %I.residents(id) ON DELETE CASCADE;
        ', schema_name, schema_name);

        EXECUTE format('
            ALTER TABLE %I.rt_members 
            ADD CONSTRAINT rt_members_resident_id_fkey 
            FOREIGN KEY (resident_id) REFERENCES %I.residents(id) ON DELETE CASCADE;
        ', schema_name, schema_name);
    END LOOP;
END $$;
