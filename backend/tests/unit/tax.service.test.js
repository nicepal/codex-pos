const { calculateOrderTax, distributeLineTax } = require('../../src/services/tax.service');

describe('tax.service', () => {
  test('calculateOrderTax applies rate after discount', () => {
    expect(calculateOrderTax(100, 10, 10)).toBe(9);
    expect(calculateOrderTax(100, 0, 0)).toBe(0);
  });

  test('distributeLineTax sums to total', () => {
    const taxes = distributeLineTax([60, 40], 10);
    expect(taxes.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 2);
  });
});
