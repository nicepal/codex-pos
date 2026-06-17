const db = require('../config/database');

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

function calculateOrderTax(subtotal, discountAmount, taxRatePercent, isInclusive = false) {
  const taxable = Math.max(0, subtotal - (discountAmount || 0));
  const rate = parseFloat(taxRatePercent) || 0;
  if (rate <= 0) return 0;
  if (isInclusive) {
    return Math.round((taxable - taxable / (1 + rate / 100)) * 100) / 100;
  }
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

async function loadTaxRules(tenantId) {
  const result = await db.query(
    `SELECT id, rate, category_id, is_default, is_inclusive FROM tax_rules
     WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId]
  );
  return result.rows;
}

function resolveRuleForItem(rules, item, defaultRate, defaultInclusive) {
  if (item.tax_rule_id) {
    const productRule = rules.find((r) => r.id === item.tax_rule_id);
    if (productRule) return { rate: parseFloat(productRule.rate), isInclusive: productRule.is_inclusive };
  }
  if (item.category_id) {
    const catRule = rules.find((r) => r.category_id === item.category_id);
    if (catRule) return { rate: parseFloat(catRule.rate), isInclusive: catRule.is_inclusive };
  }
  const defaultRule = rules.find((r) => r.is_default);
  if (defaultRule) return { rate: parseFloat(defaultRule.rate), isInclusive: defaultRule.is_inclusive };
  return { rate: defaultRate, isInclusive: defaultInclusive };
}

async function applyTaxToResolvedItems(tenantId, resolvedItems, discountAmount = 0, customerId = null) {
  const { resolveTenantFeatures, isFeatureEnabled } = require('../shared/features');
  const features = await resolveTenantFeatures(tenantId);
  const baseRate = await getTaxRate(tenantId);

  let taxExempt = false;
  if (customerId && isFeatureEnabled(features, 'tax_advanced')) {
    const cust = await db.query(
      'SELECT tax_exempt FROM customers WHERE id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );
    taxExempt = Boolean(cust.rows[0]?.tax_exempt);
  }

  if (taxExempt) {
    return resolvedItems.map((item) => ({ ...item, tax: 0 }));
  }

  if (!isFeatureEnabled(features, 'tax_advanced')) {
    const subtotal = resolvedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const totalTax = calculateOrderTax(subtotal, discountAmount, baseRate, false);
    const lineSubtotals = resolvedItems.map((i) => i.unit_price * i.quantity);
    const lineTaxes = distributeLineTax(lineSubtotals, totalTax);
    return resolvedItems.map((item, idx) => ({ ...item, tax: lineTaxes[idx] }));
  }

  const rules = await loadTaxRules(tenantId);
  const lineResults = resolvedItems.map((item) => {
    const { rate, isInclusive } = resolveRuleForItem(rules, item, baseRate, false);
    const lineSub = item.unit_price * item.quantity;
  const lineDiscShare = discountAmount > 0
      ? (lineSub / resolvedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)) * discountAmount
      : 0;
    const tax = calculateOrderTax(lineSub, lineDiscShare, rate, isInclusive);
    return { ...item, tax };
  });

  return lineResults;
}

module.exports = {
  getTaxRate,
  calculateOrderTax,
  distributeLineTax,
  applyTaxToResolvedItems,
  loadTaxRules,
  resolveRuleForItem,
};
