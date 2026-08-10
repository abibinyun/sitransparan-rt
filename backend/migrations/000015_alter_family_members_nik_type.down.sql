-- 000015 down: revert family_members.nik to VARCHAR(16).
--
-- NOTE: only reversible for values that fit (unencrypted legacy data). Any
-- encrypted NIK stored as TEXT will NOT fit back into VARCHAR(16); restoring
-- is only meaningful for environments that never stored encrypted NIKs.
DO $$
DECLARE
    s TEXT;
BEGIN
    FOR s IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant\_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.family_members ALTER COLUMN nik TYPE VARCHAR(16)', s);
    END LOOP;
END $$;
