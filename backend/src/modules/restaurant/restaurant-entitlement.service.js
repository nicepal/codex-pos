const db = require('../../config/database');
const { isRestaurantBusinessType } = require('../onboarding/business-types');
const { DEFAULT_RESTAURANT_SETTINGS } = require('./restaurant.helpers');
const {
  getTenantFeatureOverrides,
  normalizeFeatures,
  getBusinessTypeEntitlements,
  CLIENT_PROTECTED_FEATURE_KEYS,
} = require('../../shared/features');

async function saveFeatureOverrides(tenantId, next, client = db) {
  if (Object.keys(next).length === 0) {
    await client.query(
      `DELETE FROM settings WHERE tenant_id = $1 AND key = 'features'`,
      [tenantId]
    );
    return;
  }

  await client.query(
    `INSERT INTO settings (tenant_id, key, value)
     VALUES ($1, 'features', $2::jsonb)
     ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [tenantId, JSON.stringify(next)]
  );
}

/**
 * Persist business-type entitlements in tenant feature overrides (backend-only path).
 * Idempotent — safe to call multiple times.
 */
async function persistEntitlementOverrides(tenantId, businessType, client = db) {
  const entitlements = getBusinessTypeEntitlements(businessType);
  const overrides = await getTenantFeatureOverrides(tenantId);
  const next = normalizeFeatures(overrides);

  for (const key of CLIENT_PROTECTED_FEATURE_KEYS) {
    if (entitlements[key]) {
      next[key] = true;
    } else {
      delete next[key];
    }
  }

  await saveFeatureOverrides(tenantId, next, client);
}

/**
 * Persist restaurant_pro in tenant feature overrides (backend-only path).
 * Idempotent — safe to call multiple times.
 */
async function persistRestaurantProOverride(tenantId, enabled, client = db) {
  const overrides = await getTenantFeatureOverrides(tenantId);
  const next = normalizeFeatures(overrides);

  if (enabled) {
    next.restaurant_pro = true;
  } else {
    delete next.restaurant_pro;
  }

  await saveFeatureOverrides(tenantId, next, client);
}

/**
 * Initialize settings.restaurant with defaults only when the key is missing.
 */
async function initRestaurantSettingsIfMissing(tenantId, client = db) {
  const existing = await client.query(
    `SELECT 1 FROM settings WHERE tenant_id = $1 AND key = 'restaurant' LIMIT 1`,
    [tenantId]
  );
  if (existing.rows[0]) return false;

  await client.query(
    `INSERT INTO settings (tenant_id, key, value)
     VALUES ($1, 'restaurant', $2::jsonb)
     ON CONFLICT (tenant_id, key) DO NOTHING`,
    [tenantId, JSON.stringify(DEFAULT_RESTAURANT_SETTINGS)]
  );
  return true;
}

/**
 * Sync business-type entitlements and default restaurant settings when applicable.
 * Retail → Restaurant: enable packs + init settings. Restaurant → Retail: remove restaurant_pro only.
 */
async function syncForBusinessType(tenantId, businessType, client = db) {
  await persistEntitlementOverrides(tenantId, businessType, client);
  if (isRestaurantBusinessType(businessType)) {
    await initRestaurantSettingsIfMissing(tenantId, client);
  }
}

module.exports = {
  syncForBusinessType,
  initRestaurantSettingsIfMissing,
  persistEntitlementOverrides,
  persistRestaurantProOverride,
};
