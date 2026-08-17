import { describe, expect, it } from 'vitest';
import {
  balancePeers,
  canParseForBalance,
  initialAmounts,
} from '../../src/components/pos/SplitPaymentDialog';
import { roundMoney, safeNumber } from '../../src/utils/currency';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
];

function sumAmounts(amounts) {
  return roundMoney(Object.values(amounts).reduce((s, v) => s + safeNumber(v), 0));
}

describe('SplitPaymentDialog auto-balance', () => {
  it('opens with equal split that sums to totalDue', () => {
    expect(initialAmounts(METHODS, 12)).toEqual({ cash: '6.00', card: '6.00' });
    const odd = initialAmounts(METHODS, 10.01);
    expect(sumAmounts(odd)).toBe(10.01);
    expect(initialAmounts(METHODS, 25.24)).toEqual({ cash: '12.62', card: '12.62' });
  });

  it('Cash 6→2 ⇒ Card 10 (total 12)', () => {
    const next = balancePeers(METHODS, 'cash', '2', 12);
    expect(next).toEqual({ cash: '2', card: '10.00' });
    expect(sumAmounts(next)).toBe(12);
  });

  it('Cash →8 ⇒ Card 4', () => {
    expect(balancePeers(METHODS, 'cash', '8', 12)).toEqual({ cash: '8', card: '4.00' });
  });

  it('Card →3 ⇒ Cash 9', () => {
    expect(balancePeers(METHODS, 'card', '3', 12)).toEqual({ cash: '9.00', card: '3' });
  });

  it('Cash →0 ⇒ Card 12', () => {
    expect(balancePeers(METHODS, 'cash', '0', 12)).toEqual({ cash: '0', card: '12.00' });
  });

  it('Cash →12 ⇒ Card 0', () => {
    expect(balancePeers(METHODS, 'cash', '12', 12)).toEqual({ cash: '12', card: '0.00' });
  });

  it('Total 25.24, Cash→10 ⇒ Card 15.24', () => {
    const next = balancePeers(METHODS, 'cash', '10', 25.24);
    expect(next).toEqual({ cash: '10', card: '15.24' });
    expect(sumAmounts(next)).toBe(25.24);
  });

  it('clamps overpayment: never negative peer', () => {
    const next = balancePeers(METHODS, 'cash', '15', 12);
    expect(next).toEqual({ cash: '12.00', card: '0.00' });
    expect(safeNumber(next.card)).toBeGreaterThanOrEqual(0);
  });

  it('allows decimal drafts without rewriting active field', () => {
    expect(canParseForBalance('10.')).toBe(true);
    const next = balancePeers(METHODS, 'cash', '10.', 12);
    expect(next.cash).toBe('10.');
    expect(next.card).toBe('2.00');
  });

  it('rejects incomplete "." for peer updates', () => {
    expect(canParseForBalance('.')).toBe(false);
    expect(canParseForBalance('')).toBe(true);
  });
});
