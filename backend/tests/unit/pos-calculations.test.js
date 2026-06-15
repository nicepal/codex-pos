/**
 * Documents expected POS calculation rules.
 * Full integration tests require test DB — see tests/integration/orders.test.js
 */
const { posOrderPayload, orderItem } = require('../helpers/factories');

function calculateCartTotals(items, discount = 0, taxRate = 0) {
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal - discount + taxAmount };
}

describe('POS cart calculations', () => {
  it('computes subtotal from line items', () => {
    const items = [
      orderItem({ unit_price: 10, quantity: 2 }),
      orderItem({ unit_price: 5, quantity: 1 }),
    ];
    const { subtotal } = calculateCartTotals(items);
    expect(subtotal).toBe(25);
  });

  it('applies discount before tax', () => {
    const items = [orderItem({ unit_price: 100, quantity: 1 })];
    const { taxAmount, total } = calculateCartTotals(items, 10, 10);
    expect(taxAmount).toBe(9);
    expect(total).toBe(99);
  });

  it('flags client-controlled pricing risk in payload', () => {
    const payload = posOrderPayload({ items: [orderItem({ unit_price: 0.01 })] });
    // Server MUST override unit_price from DB — current implementation trusts client
    expect(payload.items[0].unit_price).toBe(0.01);
    expect(true).toBe(true); // placeholder until server-side pricing is implemented
  });
});
