-- 000011: Seed tenant_users mapping for the legacy platform superadmin account
-- (superadmin@platform.local). The application derives roles exclusively from
-- the tenant_users/roles mapping; seeding this mapping removes the need for any
-- email-address-based role derivation.
INSERT INTO tenant_users (id, tenant_id, user_id, role_id, status)
SELECT
    '00000000-0000-0000-0000-0000000000aa',
    t.id,
    u.id,
    r.id,
    'active'
FROM tenants t
JOIN users u ON u.email = 'superadmin@platform.local'
JOIN roles r ON r.name = 'superadmin'
WHERE t.slug = 'sitransparan-rt'
ON CONFLICT (tenant_id, user_id) DO NOTHING;
