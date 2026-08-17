/**
 * POS cart tax estimate aligned with backend tax.service rules.
 * Used for display/split totals only — server remains source of truth at checkout.
 */

export function calculateOrderTax(subtotal, discountAmount, taxRatePercent, isInclusive = false) {
  const taxable = Math.max(0, subtotal - (discountAmount || 0));
  const rate = parseFloat(taxRatePercent) || 0;
  if (rate <= 0) return 0;
  if (isInclusive) {
    return Math.round((taxable - taxable / (1 + rate / 100)) * 100) / 100;
  }
  return Math.round(taxable * (rate / 100) * 100) / 100;
}

export function resolveRuleForItem(rules, item, defaultRate, defaultInclusive = false) {
  const list = Array.isArray(rules) ? rules : [];
  if (item.tax_rule_id) {
    const productRule = list.find((r) => r.id === item.tax_rule_id);
    if (productRule) return { rate: parseFloat(productRule.rate), isInclusive: !!productRule.is_inclusive };
  }
  if (item.category_id) {
    const catRule = list.find((r) => r.category_id === item.category_id);
    if (catRule) return { rate: parseFloat(catRule.rate), isInclusive: !!catRule.is_inclusive };
  }
  const defaultRule = list.find((r) => r.is_default);
  if (defaultRule) return { rate: parseFloat(defaultRule.rate), isInclusive: !!defaultRule.is_inclusive };
  return { rate: defaultRate, isInclusive: defaultInclusive };
}

/**
 * @returns {{ taxAmount: number, effectiveRate: number, source: 'rules'|'flat' }}
 */
export function estimateCartTax({
  items,
  discount = 0,
  baseRate = 0,
  taxRules = null,
  taxAdvanced = false,
  taxExempt = false,
}) {
  if (taxExempt) return { taxAmount: 0, effectiveRate: 0, source: 'exempt' };

  const lines = items || [];
  const subtotal = lines.reduce((s, i) => {
    const price = i.open_price != null ? i.open_price : (i.sale_price ?? i.unit_price ?? 0);
    return s + price * (i.quantity || 0);
  }, 0);

  if (!taxAdvanced || !taxRules?.length) {
    const taxAmount = calculateOrderTax(subtotal, discount, baseRate, false);
    return { taxAmount, effectiveRate: baseRate, source: 'flat' };
  }

  const totalLine = lines.reduce((s, i) => {
    const price = i.open_price != null ? i.open_price : (i.sale_price ?? i.unit_price ?? 0);
    return s + price * (i.quantity || 0);
  }, 0) || 1;

  let taxAmount = 0;
  let weightedRate = 0;
  for (const item of lines) {
    const price = item.open_price != null ? item.open_price : (item.sale_price ?? item.unit_price ?? 0);
    const lineSub = price * (item.quantity || 0);
    const lineDisc = discount > 0 ? (lineSub / totalLine) * discount : 0;
    const { rate, isInclusive } = resolveRuleForItem(taxRules, item, baseRate, false);
    taxAmount += calculateOrderTax(lineSub, lineDisc, rate, isInclusive);
    weightedRate += rate * lineSub;
  }
  taxAmount = Math.round(taxAmount * 100) / 100;
  const effectiveRate = totalLine > 0 ? Math.round((weightedRate / totalLine) * 100) / 100 : baseRate;
  return { taxAmount, effectiveRate, source: 'rules' };
}
