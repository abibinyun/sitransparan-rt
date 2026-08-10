-- 000015: Widen family_members.nik to TEXT in every tenant schema.
--
-- family_members.nik is stored ENCRYPTED (AES-256-GCM, ~96 chars), which
-- overflows the original VARCHAR(16) column and makes adding a family member
-- fail with a 22001 "value too long" error. The residents.nik column already
-- uses TEXT; this migration brings family_members in line.
--
-- Unlike 000002 (edited in place for freshly provisioned schemas), this
-- migration repairs schemas that already exist in any environment, so the
-- fix is reproducible on staging/production instead of a one-off ALTER.
DO $$
DECLARE
    s TEXT;
BEGIN
    FOR s IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant\_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.family_members ALTER COLUMN nik TYPE TEXT', s);
    END LOOP;
END $$;
