-- Migrasi penambahan kolom pic_user_id pada tabel funds dan fee_categories
DO $$
DECLARE
    schema_record RECORD;
BEGIN
    -- 1. Tabel funds di public schema (jika ada)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'funds'
    ) THEN
        ALTER TABLE public.funds 
        ADD COLUMN IF NOT EXISTS pic_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- 2. Tabel fee_categories di public schema (jika ada)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'fee_categories'
    ) THEN
        ALTER TABLE public.fee_categories 
        ADD COLUMN IF NOT EXISTS pic_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- 3. Untuk seluruh schema tenant
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            ALTER TABLE %I.funds 
            ADD COLUMN IF NOT EXISTS pic_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        ', schema_record.schema_name);

        EXECUTE format('
            ALTER TABLE %I.fee_categories 
            ADD COLUMN IF NOT EXISTS pic_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        ', schema_record.schema_name);

        -- Index foreign key untuk query join performa tinggi
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_funds_pic ON %I.funds (pic_user_id);
        ', replace(schema_record.schema_name, 'tenant_', ''), schema_record.schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS idx_%s_fee_categories_pic ON %I.fee_categories (pic_user_id);
        ', replace(schema_record.schema_name, 'tenant_', ''), schema_record.schema_name);
    END LOOP;
END $$;
