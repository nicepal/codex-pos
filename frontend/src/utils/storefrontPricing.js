/** Storefront pricing helpers — do not invent tax/shipping unless explicitly requested. */

export const FREE_SHIPPING_THRESHOLD = 50;
export const SHIPPING_COST = 5.99;
export const TAX_RATE = 0.09;

/**
 * @param {number} subtotal
 * @param {{ estimateShipping?: boolean, estimateTax?: boolean }} [options]
 */
export function calcOrderTotals(subtotal, options = {}) {
  const { estimateShipping = false, estimateTax = false } = options;
  const shipping = estimateShipping
    ? (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST)
    : 0;
  const tax = estimateTax ? subtotal * TAX_RATE : 0;
  const total = subtotal + shipping + tax;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  return { subtotal, shipping, tax, total, freeShippingRemaining };
}
