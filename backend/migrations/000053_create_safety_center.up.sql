-- Migration: 000053_create_safety_center.up.sql
-- Tabel emergency_alerts (Panic Button) dan house_vacancies (Lapor Rumah Mudik/Kosong) per tenant

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
            CREATE TABLE IF NOT EXISTS %I.emergency_alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                house_id UUID REFERENCES %I.houses(id) ON DELETE SET NULL,
                reporter_name VARCHAR(150) NOT NULL,
                house_number VARCHAR(50),
                alert_type VARCHAR(50) NOT NULL, -- medical, fire, crime, other
                description TEXT,
                status VARCHAR(30) NOT NULL DEFAULT ''active'', -- active, resolved
                resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                resolved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_%s_emergency_alerts_status 
            ON %I.emergency_alerts(status, created_at DESC);

            CREATE TABLE IF NOT EXISTS %I.house_vacancies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                house_id UUID NOT NULL REFERENCES %I.houses(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                emergency_contact VARCHAR(50) NOT NULL,
                notes TEXT,
                status VARCHAR(30) NOT NULL DEFAULT ''active'', -- active, completed
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_%s_house_vacancies_dates 
            ON %I.house_vacancies(start_date, end_date, status);
        ', 
        schema_record.schema_name, 
        schema_record.schema_name, 
        schema_record.schema_name, 
        schema_record.schema_name,
        schema_record.schema_name,
        schema_record.schema_name,
        schema_record.schema_name,
        schema_record.schema_name);
    END LOOP;
END $$;
