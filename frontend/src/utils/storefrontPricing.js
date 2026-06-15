export const FREE_SHIPPING_THRESHOLD = 50;
export const SHIPPING_COST = 5.99;
export const TAX_RATE = 0.09;

export function calcOrderTotals(subtotal) {
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  return { subtotal, shipping, tax, total, freeShippingRemaining };
}
