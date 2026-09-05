-- Migration: 000037_create_inventory.up.sql

DO $$
DECLARE
    t RECORD;
    schema_name TEXT;
BEGIN
    FOR t IN SELECT slug FROM public.tenants LOOP
        schema_name := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.inventory_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_code VARCHAR(100),
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL DEFAULT ''Umum'', -- Tenda, Kursi, Sound System, Kebersihan, Keamanan, Olahraga, Elektronik, Fasilitas, dll
                description TEXT,
                quantity INT NOT NULL DEFAULT 1,
                available_quantity INT NOT NULL DEFAULT 1,
                unit VARCHAR(50) NOT NULL DEFAULT ''Unit'', -- Unit, Pcs, Set, Buah, Lembar, dll
                condition VARCHAR(50) NOT NULL DEFAULT ''good'', -- good, fair, damaged, lost
                location VARCHAR(255) DEFAULT ''Balai RT'',
                source_fund VARCHAR(100) DEFAULT ''Kas RT'', -- Hibah, Donasi, Swadaya, Bantuan Pemda, dll
                purchase_date DATE,
                purchase_price NUMERIC(15, 2) DEFAULT 0,
                photo_url TEXT,
                is_borrowable BOOLEAN NOT NULL DEFAULT TRUE,
                notes TEXT,
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );

            CREATE TABLE IF NOT EXISTS %I.inventory_borrowings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id UUID NOT NULL REFERENCES %I.inventory_items(id) ON DELETE CASCADE,
                borrower_name VARCHAR(255) NOT NULL,
                borrower_phone VARCHAR(50),
                borrower_resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                borrower_house_id UUID REFERENCES %I.houses(id) ON DELETE SET NULL,
                quantity INT NOT NULL DEFAULT 1,
                purpose TEXT,
                borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
                expected_return_date DATE,
                actual_return_date DATE,
                status VARCHAR(50) NOT NULL DEFAULT ''pending'', -- pending, approved, borrowed, returned, rejected, overdue
                condition_before VARCHAR(50) DEFAULT ''good'',
                condition_after VARCHAR(50),
                admin_notes TEXT,
                approved_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );

            CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON %I.inventory_items(category);
            CREATE INDEX IF NOT EXISTS idx_inventory_items_condition ON %I.inventory_items(condition);
            CREATE INDEX IF NOT EXISTS idx_inventory_borrowings_item ON %I.inventory_borrowings(item_id);
            CREATE INDEX IF NOT EXISTS idx_inventory_borrowings_status ON %I.inventory_borrowings(status);
        ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);
    END LOOP;
END $$;
