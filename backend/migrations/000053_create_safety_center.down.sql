-- Migration: 000053_create_safety_center.down.sql
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            DROP TABLE IF EXISTS %I.emergency_alerts CASCADE;
            DROP TABLE IF EXISTS %I.house_vacancies CASCADE;
        ', schema_record.schema_name, schema_record.schema_name);
    END LOOP;
END $$;
