-- Add tenant_users mapping for SuperAdmin user
INSERT INTO tenant_users (id, tenant_id, user_id, role_id, status)
SELECT
    '00000000-0000-0000-0000-000000000099',
    t.id,
    u.id,
    r.id,
    'active'
FROM tenants t
JOIN users u ON u.email = 'admin@gmail.com'
JOIN roles r ON r.name = 'superadmin'
WHERE t.slug = 'sitransparan-rt'
ON CONFLICT (tenant_id, user_id) DO NOTHING;
