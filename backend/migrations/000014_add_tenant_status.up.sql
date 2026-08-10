-- 000014: Add tenant lifecycle status.
--
-- Tenants are created 'active'. Setting a tenant to 'inactive' disables access
-- through every resolution boundary (TenantMiddleware, public tenant endpoints,
-- tenant switching) even though wildcard DNS still routes the hostname to the
-- application. This makes tenant disable/delete behavior explicit instead of
-- relying on wildcard DNS being absent.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';
