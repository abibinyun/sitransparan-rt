INSERT INTO tenants (id, name, slug, domain, logo_url)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'Sitransparan RT',
    'sitransparan-rt',
    NULL,
    NULL
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, phone)
VALUES (
    '00000000-0000-0000-0000-000000000011',
    'admin@sitransparan.rt',
    '$2a$10$fhrsaCglx7XO/a1.Momrm.gS47pOjIaR/FqQghMzB2h9THg2irLFm',
    'Default Admin RT',
    NULL
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO tenant_users (id, tenant_id, user_id, role_id, status)
SELECT
    '00000000-0000-0000-0000-000000000012',
    t.id,
    u.id,
    r.id,
    'active'
FROM tenants t
JOIN users u ON u.email = 'admin@sitransparan.rt'
JOIN roles r ON r.name = 'admin_rt'
WHERE t.slug = 'sitransparan-rt'
ON CONFLICT (tenant_id, user_id) DO NOTHING;
