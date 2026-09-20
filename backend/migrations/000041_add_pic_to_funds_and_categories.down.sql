-- Revert migrasi pic_user_id
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'funds'
    ) THEN
        ALTER TABLE public.funds DROP COLUMN IF EXISTS pic_user_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'fee_categories'
    ) THEN
        ALTER TABLE public.fee_categories DROP COLUMN IF EXISTS pic_user_id;
    END IF;

    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_funds_pic;', schema_record.schema_name, replace(schema_record.schema_name, 'tenant_', ''));
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_fee_categories_pic;', schema_record.schema_name, replace(schema_record.schema_name, 'tenant_', ''));
        EXECUTE format('ALTER TABLE %I.funds DROP COLUMN IF EXISTS pic_user_id;', schema_record.schema_name);
        EXECUTE format('ALTER TABLE %I.fee_categories DROP COLUMN IF EXISTS pic_user_id;', schema_record.schema_name);
    END LOOP;
END $$;
