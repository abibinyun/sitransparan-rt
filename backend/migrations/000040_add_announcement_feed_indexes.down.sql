-- Revert migrasi indeks feed linimasa
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_announcements_feed;', schema_record.schema_name, replace(schema_record.schema_name, 'tenant_', ''));
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_announcements_cat_feed;', schema_record.schema_name, replace(schema_record.schema_name, 'tenant_', ''));
    END LOOP;
END $$;
