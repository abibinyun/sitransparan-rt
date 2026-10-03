-- Migration: 000052_create_notifications.down.sql
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.notifications CASCADE;', schema_record.schema_name);
    END LOOP;
END $$;
