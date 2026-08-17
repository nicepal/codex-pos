/**
 * Pure expected-cash math for register reconciliation (mirrors drawer.service).
 * expected = opening + cashSales + cashIn − cashRefunds − cashOut
 *
 * cashSales should include gross cash tenders for the session even when an order
 * is later refunded — refunds are subtracted separately via cashRefunds.
 */
export function computeExpectedCash({
  openingFloat = 0,
  cashSales = 0,
  cashIn = 0,
  cashRefunds = 0,
  cashOut = 0,
} = {}) {
  const n = (v) => Math.round((Number(v) || 0) * 100) / 100;
  return n(n(openingFloat) + n(cashSales) + n(cashIn) - n(cashRefunds) - n(cashOut));
}
