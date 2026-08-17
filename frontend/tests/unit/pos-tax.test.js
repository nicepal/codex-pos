import { describe, it, expect } from 'vitest';
import { calculateOrderTax, estimateCartTax, resolveRuleForItem } from '../../src/utils/posTax';

describe('posTax estimate (BUG-POS-002)', () => {
  it('flat rate matches discount-before-tax', () => {
    const { taxAmount, source } = estimateCartTax({
      items: [{ sale_price: 100, quantity: 1 }],
      discount: 10,
      baseRate: 10,
      taxAdvanced: false,
    });
    expect(source).toBe('flat');
    expect(taxAmount).toBe(9);
  });

  it('uses tax_rules default when advanced', () => {
    const rules = [{ id: '1', rate: 5, is_default: true, is_inclusive: false }];
    const { taxAmount, source, effectiveRate } = estimateCartTax({
      items: [{ sale_price: 100, quantity: 1 }],
      discount: 0,
      baseRate: 10,
      taxRules: rules,
      taxAdvanced: true,
    });
    expect(source).toBe('rules');
    expect(taxAmount).toBe(5);
    expect(effectiveRate).toBe(5);
  });

  it('category rule beats flat default', () => {
    const rules = [
      { id: 'd', rate: 10, is_default: true },
      { id: 'c', rate: 8, category_id: 'cat-1' },
    ];
    const rule = resolveRuleForItem(rules, { category_id: 'cat-1' }, 0);
    expect(rule.rate).toBe(8);
    expect(calculateOrderTax(50, 0, rule.rate)).toBe(4);
  });
});
