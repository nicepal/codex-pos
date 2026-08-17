import { describe, expect, it } from 'vitest';
import { computeExpectedCash } from '../../src/utils/registerCash';
import { cashQuickAmounts } from '../../src/components/pos/posHelpers';

describe('computeExpectedCash', () => {
  it('opening + sales + in − refunds − out', () => {
    expect(computeExpectedCash({
      openingFloat: 100,
      cashSales: 50.5,
      cashIn: 20,
      cashRefunds: 10.25,
      cashOut: 5,
    })).toBe(155.25);
  });

  it('handles empty / zero', () => {
    expect(computeExpectedCash({})).toBe(0);
    expect(computeExpectedCash({ openingFloat: 40 })).toBe(40);
  });

  it('nets full cash refund when gross sale and refund both count', () => {
    expect(computeExpectedCash({
      openingFloat: 100,
      cashSales: 135.21,
      cashRefunds: 135.21,
    })).toBe(100);
  });
});

describe('managerEmployees', () => {
  it('prefers manager roles', async () => {
    const { managerEmployees } = await import('../../src/components/pos/posHelpers');
    const list = managerEmployees([
      { id: '1', name: 'Cash', role: 'cashier' },
      { id: '2', name: 'Boss', role: 'manager' },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('2');
  });
});

describe('cashQuickAmounts', () => {
  it('includes due and larger presets', () => {
    const amounts = cashQuickAmounts(12.4);
    expect(amounts[0]).toBe(12.4);
    expect(amounts.some((a) => a >= 20)).toBe(true);
  });
});
