-- Migration: Create Event Committee Roles and Event Receipts
CREATE TABLE IF NOT EXISTS event_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, resident_id, role)
);

CREATE TABLE IF NOT EXISTS event_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    receipt_url TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
