import { describe, it, expect } from 'vitest';

/** Mirror frontend cart total logic for regression */
function cartSubtotal(items) {
  return items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
}

describe('POS cart subtotal', () => {
  it('sums line items', () => {
    const items = [
      { unit_price: 10, quantity: 2 },
      { unit_price: 5.5, quantity: 1 },
    ];
    expect(cartSubtotal(items)).toBe(25.5);
  });

  it('returns 0 for empty cart', () => {
    expect(cartSubtotal([])).toBe(0);
  });
});

describe('resolveImageUrl', () => {
  async function load() {
    return import('../../src/utils/imageUrl.js');
  }

  it('returns relative paths unchanged', async () => {
    const { resolveImageUrl } = await load();
    expect(resolveImageUrl('/api/v1/uploads/x.jpg')).toBe('/api/v1/uploads/x.jpg');
  });

  it('normalizes absolute upload URLs to pathname', async () => {
    const { resolveImageUrl } = await load();
    expect(resolveImageUrl('http://localhost:5001/api/v1/uploads/a.png')).toBe('/api/v1/uploads/a.png');
  });
});
