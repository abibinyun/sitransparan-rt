-- Migration 000025: Support public web push subscriptions with tenant_id and nullable user_id
ALTER TABLE push_subscriptions
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE push_subscriptions
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant
    ON push_subscriptions (tenant_id);
