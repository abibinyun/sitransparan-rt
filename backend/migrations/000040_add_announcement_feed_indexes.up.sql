-- Migrasi penambahan indeks komposit untuk query timeline & linimasa sosmed
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- 1. Index komposit untuk filter feed linimasa utama: (deleted_at, target, created_at DESC)
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_announcements_feed 
            ON %I.announcements (deleted_at, target, created_at DESC);
        ', replace(schema_record.schema_name, 'tenant_', ''), schema_record.schema_name);

        -- 2. Index komposit untuk filter per kategori: (deleted_at, category, created_at DESC)
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_announcements_cat_feed 
            ON %I.announcements (deleted_at, category, created_at DESC);
        ', replace(schema_record.schema_name, 'tenant_', ''), schema_record.schema_name);
    END LOOP;
END $$;
