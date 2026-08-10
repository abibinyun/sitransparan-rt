-- 000012: Provision tenant schemas for tenants that were created before
-- schema-per-tenant provisioning existed (e.g. seeded tenants like
-- sitransparan-rt). It mirrors repository.CreateTenantSchema (including
-- event_roles / event_receipts) and copies the seeded public demo data into
-- the corresponding tenant schema.
DO $$
DECLARE
    t RECORD;
    s TEXT;
BEGIN
    FOR t IN SELECT id, slug FROM tenants LOOP
        s := 'tenant_' || replace(t.slug, '-', '_');

        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.residents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                nik TEXT,
                nik_hash VARCHAR(64),
                kk_number VARCHAR(16),
                full_name VARCHAR(255),
                gender VARCHAR(50),
                birth_place VARCHAR(255),
                birth_date DATE,
                address TEXT,
                rt_rw VARCHAR(50),
                phone VARCHAR(50),
                is_head_of_family BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                ktp_url TEXT,
                kk_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.family_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                resident_id UUID NOT NULL REFERENCES %I.residents(id) ON DELETE CASCADE,
                full_name VARCHAR(255),
                nik VARCHAR(16),
                relation VARCHAR(100),
                birth_date DATE,
                gender VARCHAR(50),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.fee_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                period VARCHAR(50) NOT NULL CHECK (period IN ('monthly', 'one_time')),
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.dues_payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                resident_id UUID NOT NULL REFERENCES %I.residents(id) ON DELETE CASCADE,
                fee_category_id UUID NOT NULL REFERENCES %I.fee_categories(id) ON DELETE RESTRICT,
                amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                period_month INT NOT NULL,
                period_year INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
                proof_url TEXT,
                verified_at TIMESTAMPTZ,
                verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.financial_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
                category VARCHAR(255) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
                description TEXT,
                proof_url TEXT,
                created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_date TIMESTAMPTZ,
                location VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
                created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.event_budgets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
                item VARCHAR(255),
                category VARCHAR(100),
                description VARCHAR(255) NOT NULL,
                planned_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                actual_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                estimated_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
                actual_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.event_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
                resident_id UUID NOT NULL REFERENCES %I.residents(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'absent', 'maybe')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (event_id, resident_id)
            )
        $ddl$, s, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.event_sponsors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                type VARCHAR(50) NOT NULL CHECK (type IN ('cash', 'goods', 'service')),
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.event_roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
                resident_id UUID NOT NULL REFERENCES %I.residents(id) ON DELETE CASCADE,
                role VARCHAR(100) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (event_id, resident_id, role)
            )
        $ddl$, s, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.event_receipts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
                resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                receipt_url TEXT NOT NULL,
                amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.aspirations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                resident_id UUID REFERENCES %I.residents(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(50) NOT NULL CHECK (category IN ('suggestion', 'complaint', 'question')),
                status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'rejected')),
                is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
                response TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.community_needs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                estimated_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed')),
                progress_notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.announcements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                attachment_url TEXT,
                target VARCHAR(50) NOT NULL CHECK (target IN ('all', 'residents_only')),
                created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        EXECUTE format($ddl$
            CREATE TABLE IF NOT EXISTS %I.documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL CHECK (category IN ('financial_report', 'minutes', 'letter', 'other')),
                file_url TEXT NOT NULL,
                uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        $ddl$, s);

        -- Copy seeded public demo data into the tenant schema (idempotent).
        EXECUTE format('INSERT INTO %I.announcements (id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at) SELECT id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at FROM public.announcements WHERE tenant_id = $1 AND NOT EXISTS (SELECT 1 FROM %I.announcements a WHERE a.id = public.announcements.id)', s, s) USING t.id;
        EXECUTE format('INSERT INTO %I.documents (id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at) SELECT id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at FROM public.documents WHERE tenant_id = $1 AND NOT EXISTS (SELECT 1 FROM %I.documents d WHERE d.id = public.documents.id)', s, s) USING t.id;
        EXECUTE format('INSERT INTO %I.aspirations (id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at) SELECT id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at FROM public.aspirations WHERE tenant_id = $1 AND NOT EXISTS (SELECT 1 FROM %I.aspirations a WHERE a.id = public.aspirations.id)', s, s) USING t.id;
        EXECUTE format('INSERT INTO %I.community_needs (id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at) SELECT id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at FROM public.community_needs WHERE tenant_id = $1 AND NOT EXISTS (SELECT 1 FROM %I.community_needs c WHERE c.id = public.community_needs.id)', s, s) USING t.id;
    END LOOP;
END $$;
