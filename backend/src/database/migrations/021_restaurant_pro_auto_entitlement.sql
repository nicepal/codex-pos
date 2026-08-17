-- Backfill restaurant_pro entitlement and default restaurant settings for existing restaurant tenants.
-- Idempotent: safe to re-run; only updates rows that need it.

-- 1. Merge restaurant_pro: true into settings.features for restaurant business types
INSERT INTO settings (tenant_id, key, value)
SELECT
  t.id,
  'features',
  COALESCE(
    (
      SELECT (s.value::jsonb || '{"restaurant_pro": true}'::jsonb)::jsonb
      FROM settings s
      WHERE s.tenant_id = t.id AND s.key = 'features'
    ),
    '{"restaurant_pro": true}'::jsonb
  )
FROM tenants t
WHERE t.business_type = 'restaurant'
  AND NOT EXISTS (
    SELECT 1 FROM settings s
    WHERE s.tenant_id = t.id
      AND s.key = 'features'
      AND COALESCE((s.value::jsonb ->> 'restaurant_pro')::boolean, false) = true
  )
ON CONFLICT (tenant_id, key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW()
WHERE COALESCE((settings.value::jsonb ->> 'restaurant_pro')::boolean, false) IS DISTINCT FROM true;

-- 2. Initialize settings.restaurant defaults where missing
INSERT INTO settings (tenant_id, key, value)
SELECT
  t.id,
  'restaurant',
  '{
    "default_guest_count": 2,
    "show_capacity_on_floor_plan": true,
    "post_close_table_status": "available",
    "enable_reservations": false,
    "default_floor_id": null
  }'::jsonb
FROM tenants t
WHERE t.business_type = 'restaurant'
  AND NOT EXISTS (
    SELECT 1 FROM settings s
    WHERE s.tenant_id = t.id AND s.key = 'restaurant'
  )
ON CONFLICT (tenant_id, key) DO NOTHING;
