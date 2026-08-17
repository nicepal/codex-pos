const { derivePaymentFields, restockQtyAfterReturns, allocateProportionalRefund } = require('../../src/modules/orders/orders.helpers');
const branchStockService = require('../../src/modules/inventory/branch-stock.service');

describe('Financial integrity helpers (audit P0/P1)', () => {
  describe('derivePaymentFields', () => {
    test('split payments[] mark order paid with method split', () => {
      const r = derivePaymentFields({
        payments: [
          { method: 'cash', amount: 10 },
          { method: 'card', amount: 5 },
        ],
        status: 'paid',
      });
      expect(r.paymentStatus).toBe('paid');
      expect(r.primaryPaymentMethod).toBe('split');
    });

    test('single payment_method marks paid', () => {
      const r = derivePaymentFields({ payment_method: 'cash', status: 'paid' });
      expect(r.paymentStatus).toBe('paid');
      expect(r.primaryPaymentMethod).toBe('cash');
    });

    test('on_hold stays pending even with tender', () => {
      const r = derivePaymentFields({ payment_method: 'cash', status: 'on_hold' });
      expect(r.paymentStatus).toBe('pending');
    });

    test('no tender stays pending', () => {
      const r = derivePaymentFields({ status: 'paid' });
      expect(r.paymentStatus).toBe('pending');
      expect(r.primaryPaymentMethod).toBeNull();
    });
  });

  describe('restockQtyAfterReturns', () => {
    test('full refund with no prior returns restocks all', () => {
      expect(restockQtyAfterReturns(5, 0)).toBe(5);
    });

    test('refund after partial return does not double-restock', () => {
      expect(restockQtyAfterReturns(5, 2)).toBe(3);
    });

    test('fully returned line restocks zero', () => {
      expect(restockQtyAfterReturns(5, 5)).toBe(0);
    });
  });

  describe('branchStockService._isDecrement (transfer integrity)', () => {
    test('transfer outbound decrements', () => {
      expect(branchStockService._isDecrement('transfer', { quantity: 3 })).toBe(true);
    });

    test('stock_in / transfer destination path increments', () => {
      expect(branchStockService._isDecrement('stock_in', { quantity: 3 })).toBe(false);
    });

    test('sale and stock_out decrement', () => {
      expect(branchStockService._isDecrement('sale', { quantity: 1 })).toBe(true);
      expect(branchStockService._isDecrement('stock_out', { quantity: 1 })).toBe(true);
    });

    test('adjustment deducts when flagged or negative', () => {
      expect(branchStockService._isDecrement('adjustment', { quantity: 2, deduct: true })).toBe(true);
      expect(branchStockService._isDecrement('adjustment', { quantity: -2 })).toBe(true);
      expect(branchStockService._isDecrement('adjustment', { quantity: 2 })).toBe(false);
    });
  });

  describe('allocateProportionalRefund', () => {
    test('splits refund across payment methods', () => {
      const rows = allocateProportionalRefund(12, [
        { payment_method: 'cash', amount: 6 },
        { payment_method: 'card', amount: 6 },
      ]);
      expect(rows[0].refundShare).toBe(6);
      expect(rows[1].refundShare).toBe(6);
    });

    test('last row absorbs rounding remainder', () => {
      const rows = allocateProportionalRefund(10, [
        { payment_method: 'cash', amount: 3 },
        { payment_method: 'card', amount: 7 },
      ]);
      const sum = rows.reduce((s, r) => s + r.refundShare, 0);
      expect(sum).toBe(10);
    });
  });

  describe('giftCardsService.parseCodeFromReference', () => {
    const giftCards = require('../../src/modules/gift-cards/gift-cards.service');
    test('parses code from reference string', () => {
      expect(giftCards.parseCodeFromReference('GC-ABCD-1234 (bal 5.00)')).toBe('GC-ABCD-1234');
    });
  });

  describe('loyaltyService.parsePointsFromReference', () => {
    const loyalty = require('../../src/modules/loyalty/loyalty.service');
    test('parses points from reference', () => {
      expect(loyalty.parsePointsFromReference('120 pts')).toBe(120);
    });
  });
});
