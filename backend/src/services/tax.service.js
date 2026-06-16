const db = require('../config/database');

/**
 * Compute order tax server-side from tenant preferences (Phase 0).
 * Phase 2 extends with tax_rules table when tax_advanced is enabled.
 */
async function getTaxRate(tenantId) {
  const result = await db.query(
    `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'tax_rate'`,
    [tenantId]
  );
  if (!result.rows[0]?.value) return 0;
  let val = result.rows[0].value;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch { /* keep string */ }
  }
  const rate = parseFloat(val);
  return Number.isFinite(rate) ? rate : 0;
}

function calculateOrderTax(subtotal, discountAmount, taxRatePercent) {
  const taxable = Math.max(0, subtotal - (discountAmount || 0));
  const rate = parseFloat(taxRatePercent) || 0;
  return Math.round(taxable * (rate / 100) * 100) / 100;
}

function distributeLineTax(lineSubtotals, totalTax) {
  const subtotalSum = lineSubtotals.reduce((s, v) => s + v, 0);
  if (subtotalSum <= 0 || totalTax <= 0) {
    return lineSubtotals.map(() => 0);
  }
  let assigned = 0;
  return lineSubtotals.map((lineSub, idx) => {
    if (idx === lineSubtotals.length - 1) {
      return Math.round((totalTax - assigned) * 100) / 100;
    }
    const share = Math.round((lineSub / subtotalSum) * totalTax * 100) / 100;
    assigned += share;
    return share;
  });
}

async function applyTaxToResolvedItems(tenantId, resolvedItems, discountAmount = 0) {
  const { resolveTenantFeatures, isFeatureEnabled } = require('../shared/features');
  const features = await resolveTenantFeatures(tenantId);

  let taxRate;
  if (isFeatureEnabled(features, 'tax_advanced')) {
    const rules = await db.query(
      `SELECT rate, category_id, is_default FROM tax_rules WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );
    const defaultRule = rules.rows.find((r) => r.is_default);
    taxRate = defaultRule ? parseFloat(defaultRule.rate) : await getTaxRate(tenantId);
  } else {
    taxRate = await getTaxRate(tenantId);
  }

  const subtotal = resolvedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalTax = calculateOrderTax(subtotal, discountAmount, taxRate);
  const lineSubtotals = resolvedItems.map((i) => i.unit_price * i.quantity);
  const lineTaxes = distributeLineTax(lineSubtotals, totalTax);

  return resolvedItems.map((item, idx) => ({
    ...item,
    tax: lineTaxes[idx],
  }));
}

module.exports = {
  getTaxRate,
  calculateOrderTax,
  distributeLineTax,
  applyTaxToResolvedItems,
};
