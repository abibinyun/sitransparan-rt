-- Revert migrasi kolom category pada tabel announcements
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'announcements'
    ) THEN
        ALTER TABLE public.announcements DROP COLUMN IF EXISTS category;
    END IF;

    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            ALTER TABLE %I.announcements DROP COLUMN IF EXISTS category;
        ', schema_record.schema_name);
    END LOOP;
END $$;
