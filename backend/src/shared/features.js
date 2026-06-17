const db = require('../config/database');

/** Feature pack keys and metadata */
const FEATURE_PACKS = {
  pos_pro: { label: 'POS Pro', description: 'Variants at POS, returns, quick keys, manager overrides' },
  catalog_pro: { label: 'Catalog Pro', description: 'Bundles, serials, batches, CSV import' },
  tax_advanced: { label: 'Advanced Tax', description: 'Category tax rules, tax-exempt customers' },
  inventory_pro: { label: 'Inventory Pro', description: 'Transfers, stock take, PO receiving' },
  staff_pro: { label: 'Staff Pro', description: 'PIN login, drawer sessions, unified team' },
  crm_pro: { label: 'CRM Pro', description: 'Customer accounts, loyalty rules, tags' },
  omnichannel: { label: 'Omnichannel', description: 'Custom domains, click & collect, webhooks' },
  allow_negative_stock: { label: 'Allow Negative Stock', description: 'Sell when stock is zero' },
  open_price_items: { label: 'Open Price Items', description: 'Cashier can set price at POS' },
};

const PACK_KEYS = Object.keys(FEATURE_PACKS);

const PLAN_DEFAULTS = {
  starter: {
    pos_pro: false,
    catalog_pro: false,
    tax_advanced: false,
    inventory_pro: false,
    staff_pro: false,
    crm_pro: false,
    omnichannel: false,
    allow_negative_stock: false,
    open_price_items: false,
  },
  professional: {
    pos_pro: true,
    catalog_pro: true,
    tax_advanced: true,
    inventory_pro: true,
    staff_pro: false,
    crm_pro: true,
    omnichannel: true,
    allow_negative_stock: false,
    open_price_items: false,
  },
  enterprise: {
    pos_pro: true,
    catalog_pro: true,
    tax_advanced: true,
    inventory_pro: true,
    staff_pro: true,
    crm_pro: true,
    omnichannel: true,
    allow_negative_stock: true,
    open_price_items: true,
  },
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

async function resolveTenantFeatures(tenantId) {
  const planFeatures = await getPlanFeatures(tenantId);
  const overrides = await getTenantFeatureOverrides(tenantId);
  const resolved = { ...planFeatures };
  for (const [key, val] of Object.entries(overrides)) {
    resolved[key] = val;
  }
  return resolved;
}

function isFeatureEnabled(features, key) {
  return Boolean(features?.[key]);
}

/** Clamp tenant overrides to what the subscription plan allows */
function clampFeaturesToPlan(planFeatures, requestedOverrides) {
  const normalized = normalizeFeatures(requestedOverrides);
  const clamped = {};
  const capped = [];
  for (const key of PACK_KEYS) {
    const planAllows = Boolean(planFeatures[key]);
    const requested = normalized[key];
    if (typeof requested === 'boolean') {
      if (requested && !planAllows) {
        clamped[key] = false;
        capped.push(key);
      } else {
        clamped[key] = requested;
      }
    }
  }
  return { clamped, capped };
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
  normalizeFeatures,
  getPlanFeatures,
  getTenantFeatureOverrides,
  resolveTenantFeatures,
  isFeatureEnabled,
  clampFeaturesToPlan,
  assertFeatureEnabled,
};
