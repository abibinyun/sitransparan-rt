-- Migration 000025: Revert support public web push subscriptions
DROP INDEX IF EXISTS idx_push_subscriptions_tenant;
ALTER TABLE push_subscriptions DROP COLUMN IF EXISTS tenant_id;
DELETE FROM push_subscriptions WHERE user_id IS NULL;
ALTER TABLE push_subscriptions ALTER COLUMN user_id SET NOT NULL;
