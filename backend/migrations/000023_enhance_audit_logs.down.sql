DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_user_created;
DROP INDEX IF EXISTS idx_audit_logs_tenant_created;

ALTER TABLE audit_logs DROP COLUMN IF EXISTS error_message;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS status;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS house_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_agent;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS ip_address;
