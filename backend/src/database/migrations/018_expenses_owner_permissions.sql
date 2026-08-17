-- Ensure expenses permission is wired for owner/manager roles and demo tenant owner can access /expenses

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('business_owner', 'manager')
  AND p.name = 'business.expenses'
ON CONFLICT DO NOTHING;

-- Demo store primary user should have business_owner (fixes mis-seeded cashier-only owners)
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT u.id, r.id, u.tenant_id
FROM tenants t
JOIN LATERAL (
  SELECT id, tenant_id
  FROM users
  WHERE tenant_id = t.id
  ORDER BY created_at ASC
  LIMIT 1
) u ON true
JOIN roles r ON r.name = 'business_owner'
WHERE t.slug = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = u.id AND ro.name = 'business_owner'
  )
ON CONFLICT DO NOTHING;
