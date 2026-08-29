-- Migration 000023: Enhance audit_logs with IP, User-Agent, Status, Error Message, and House ID
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS house_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SUCCESS';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
