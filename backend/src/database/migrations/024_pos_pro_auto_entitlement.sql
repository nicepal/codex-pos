-- Backfill pos_pro entitlement for existing tenants with an onboarding business type.
-- Idempotent: safe to re-run; only updates rows that need it.

INSERT INTO settings (tenant_id, key, value)
SELECT
  t.id,
  'features',
  COALESCE(
    (
      SELECT (s.value::jsonb || '{"pos_pro": true}'::jsonb)::jsonb
      FROM settings s
      WHERE s.tenant_id = t.id AND s.key = 'features'
    ),
    '{"pos_pro": true}'::jsonb
  )
FROM tenants t
WHERE t.business_type IN (
  'retail', 'restaurant', 'grocery', 'fashion', 'electronics',
  'beauty', 'pharmacy', 'wholesale', 'general'
)
  AND NOT EXISTS (
    SELECT 1 FROM settings s
    WHERE s.tenant_id = t.id
      AND s.key = 'features'
      AND COALESCE((s.value::jsonb ->> 'pos_pro')::boolean, false) = true
  )
ON CONFLICT (tenant_id, key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW()
WHERE COALESCE((settings.value::jsonb ->> 'pos_pro')::boolean, false) IS DISTINCT FROM true;
