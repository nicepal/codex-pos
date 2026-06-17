const { clampFeaturesToPlan, normalizeFeatures } = require('../../src/shared/features');
const { calculateOrderTax, resolveRuleForItem } = require('../../src/services/tax.service');

describe('features clamp', () => {
  test('clampFeaturesToPlan caps disallowed overrides', () => {
    const plan = { pos_pro: true, crm_pro: false, inventory_pro: false };
    const { clamped, capped } = clampFeaturesToPlan(plan, { crm_pro: true, inventory_pro: true, pos_pro: true });
    expect(capped).toContain('crm_pro');
    expect(capped).toContain('inventory_pro');
    expect(clamped.crm_pro).toBe(false);
    expect(clamped.pos_pro).toBe(true);
  });
});

describe('tax advanced helpers', () => {
  test('calculateOrderTax inclusive mode', () => {
    const tax = calculateOrderTax(110, 0, 10, true);
    expect(tax).toBeCloseTo(10, 1);
  });

  test('resolveRuleForItem prefers product rule', () => {
    const rules = [
      { id: 'r1', category_id: 'c1', rate: 5, is_inclusive: false, is_default: false },
      { id: 'r2', category_id: null, rate: 10, is_inclusive: false, is_default: true },
    ];
    const resolved = resolveRuleForItem(rules, { tax_rule_id: 'r1', category_id: 'c1' }, 0, false);
    expect(resolved.rate).toBe(5);
  });
});
