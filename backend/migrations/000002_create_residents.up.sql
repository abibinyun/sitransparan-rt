CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    nik VARCHAR(16),
    relation VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
