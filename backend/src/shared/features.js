const db = require('../config/database');
const { isRestaurantBusinessType, isPosBusinessType } = require('../modules/onboarding/business-types');

/** Feature pack keys and metadata */
const FEATURE_PACKS = {
  pos_pro: { label: 'POS Pro', description: 'Variants at POS, returns, quick keys, manager overrides' },
  catalog_pro: { label: 'Catalog Pro', description: 'Bundles, serials, batches, CSV import' },
  tax_advanced: { label: 'Advanced Tax', description: 'Category tax rules, tax-exempt customers' },
  inventory_pro: { label: 'Inventory Pro', description: 'Transfers, stock take, PO receiving' },
  staff_pro: { label: 'Staff Pro', description: 'PIN login, drawer sessions, unified team' },
  crm_pro: { label: 'CRM Pro', description: 'Customer accounts, loyalty rules, tags' },
  omnichannel: { label: 'Omnichannel', description: 'Custom domains, click & collect, webhooks' },
  marketing_pro: { label: 'Marketing Pro', description: 'Campaigns, abandoned cart, SMS/email automation' },
  finance_pro: { label: 'Finance Pro', description: 'Ledger, journals, multi-currency, tax reports' },
  ai_pro: { label: 'AI Pro', description: 'Forecasting, content generation, AI assistant' },
  mfg_pro: { label: 'Manufacturing Pro', description: 'BOM and production orders' },
  restaurant_pro: { label: 'Restaurant Pro', description: 'Table management, floor plans, dining sessions, KDS' },
  enterprise: { label: 'Enterprise', description: 'SSO, SCIM, advanced permissions, franchise' },
  allow_negative_stock: { label: 'Allow Negative Stock', description: 'Sell when stock is zero' },
  open_price_items: { label: 'Open Price Items', description: 'Cashier can set price at POS' },
};

const PACK_KEYS = Object.keys(FEATURE_PACKS);

/** Features that clients cannot toggle via settings — managed by backend only */
const CLIENT_PROTECTED_FEATURE_KEYS = ['pos_pro', 'restaurant_pro'];

function getBusinessTypeEntitlements(businessType) {
  const entitlements = {};
  if (isPosBusinessType(businessType)) {
    entitlements.pos_pro = true;
  }
  if (isRestaurantBusinessType(businessType)) {
    entitlements.restaurant_pro = true;
  }
  return entitlements;
}

async function getTenantBusinessType(tenantId, client = db) {
  const result = await client.query(
    'SELECT business_type FROM tenants WHERE id = $1',
    [tenantId]
  );
  return result.rows[0]?.business_type || null;
}

const PLAN_DEFAULTS = {
  starter: Object.fromEntries(PACK_KEYS.map((k) => [k, false])),
  professional: {
    pos_pro: true,
    catalog_pro: true,
    tax_advanced: true,
    inventory_pro: true,
    staff_pro: false,
    crm_pro: true,
    omnichannel: true,
    marketing_pro: true,
    finance_pro: false,
    ai_pro: false,
    mfg_pro: false,
    restaurant_pro: false,
    enterprise: false,
    allow_negative_stock: false,
    open_price_items: false,
  },
  enterprise: Object.fromEntries(PACK_KEYS.map((k) => [k, true])),
};

function normalizeFeatures(input = {}) {
  const out = {};
  for (const key of PACK_KEYS) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}

async function getPlanFeatures(tenantId) {
  const result = await db.query(
    `SELECT p.slug, p.features
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY s.created_at DESC LIMIT 1`,
    [tenantId]
  );
  const row = result.rows[0];
  if (!row) return { ...PLAN_DEFAULTS.starter };

  const planSlug = row.slug || 'starter';
  const planFeatures = typeof row.features === 'object' ? row.features : {};
  const defaults = PLAN_DEFAULTS[planSlug] || PLAN_DEFAULTS.starter;

  const merged = { ...defaults };
  for (const key of PACK_KEYS) {
    if (typeof planFeatures[key] === 'boolean') merged[key] = planFeatures[key];
  }
  return merged;
}

async function getTenantFeatureOverrides(tenantId) {
  const result = await db.query(
    `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'features'`,
    [tenantId]
  );
  if (!result.rows[0]?.value) return {};
  let val = result.rows[0].value;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch { return {}; }
  }
  return normalizeFeatures(val);
}

async function resolveTenantFeatures(tenantId, client = db) {
  const planFeatures = await getPlanFeatures(tenantId);
  const overrides = await getTenantFeatureOverrides(tenantId);
  const businessType = await getTenantBusinessType(tenantId, client);
  const typeEntitlements = getBusinessTypeEntitlements(businessType);

  const resolved = { ...planFeatures };
  for (const [key, val] of Object.entries(overrides)) {
    resolved[key] = val;
  }
  for (const [key, val] of Object.entries(typeEntitlements)) {
    if (val) resolved[key] = true;
  }
  return resolved;
}

function isFeatureEnabled(features, key) {
  return Boolean(features?.[key]);
}

/** Clamp tenant overrides to what the subscription plan allows (business-type entitlements exempt) */
function clampFeaturesToPlan(planFeatures, requestedOverrides, businessType = null) {
  const normalized = normalizeFeatures(requestedOverrides);
  const typeEntitlements = getBusinessTypeEntitlements(businessType);
  const clamped = {};
  const capped = [];
  for (const key of PACK_KEYS) {
    if (CLIENT_PROTECTED_FEATURE_KEYS.includes(key)) continue;
    const planAllows = Boolean(planFeatures[key]);
    const requested = normalized[key];
    if (typeof requested === 'boolean') {
      if (requested && !planAllows && !typeEntitlements[key]) {
        clamped[key] = false;
        capped.push(key);
      } else {
        clamped[key] = requested;
      }
    }
  }
  return { clamped, capped };
}

function stripClientProtectedFeatures(requestedOverrides) {
  const normalized = normalizeFeatures(requestedOverrides);
  for (const key of CLIENT_PROTECTED_FEATURE_KEYS) {
    delete normalized[key];
  }
  return normalized;
}

async function assertFeatureEnabled(tenantId, key) {
  const { ForbiddenError } = require('./errors');
  const features = await resolveTenantFeatures(tenantId);
  if (!isFeatureEnabled(features, key)) {
    throw new ForbiddenError(`Feature "${key}" is not enabled for this business`);
  }
  return features;
}

module.exports = {
  FEATURE_PACKS,
  PACK_KEYS,
  PLAN_DEFAULTS,
  CLIENT_PROTECTED_FEATURE_KEYS,
  normalizeFeatures,
  getPlanFeatures,
  getTenantFeatureOverrides,
  getTenantBusinessType,
  getBusinessTypeEntitlements,
  resolveTenantFeatures,
  isFeatureEnabled,
  clampFeaturesToPlan,
  stripClientProtectedFeatures,
  assertFeatureEnabled,
};
