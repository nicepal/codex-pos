/**
 * Pure helpers for POS order payment/restock integrity (unit-testable).
 */

function derivePaymentFields({ payment_method, payments, gift_card_code, status }) {
  const hasTender = Boolean(
    payment_method
    || (Array.isArray(payments) && payments.length)
    || gift_card_code
  );
  const paymentStatus = hasTender && status !== 'on_hold' ? 'paid' : 'pending';
  const primaryPaymentMethod = payment_method
    || (Array.isArray(payments) && payments.length === 1 ? payments[0].method : null)
    || (Array.isArray(payments) && payments.length > 1 ? 'split' : null)
    || (gift_card_code ? 'gift_card' : null);
  return { hasTender, paymentStatus, primaryPaymentMethod };
}

/** Qty still eligible to restock on full refund after prior returns. */
function restockQtyAfterReturns(orderedQty, alreadyRestockedQty = 0) {
  const ordered = parseInt(orderedQty, 10) || 0;
  const prior = parseInt(alreadyRestockedQty, 10) || 0;
  return Math.max(0, ordered - prior);
}

/** Allocate refund proportionally across order payment rows (last row absorbs rounding). */
function allocateProportionalRefund(totalRefund, payments) {
  const rows = (payments || []).map((p) => ({
    ...p,
    amount: parseFloat(p.amount) || 0,
    payment_method: p.payment_method || p.method,
  }));
  const payTotal = rows.reduce((s, p) => s + p.amount, 0);
  const refund = parseFloat(totalRefund) || 0;
  if (!payTotal || refund <= 0) return rows.map((p) => ({ ...p, refundShare: 0 }));

  let allocated = 0;
  return rows.map((p, idx) => {
    if (idx === rows.length - 1) {
      return { ...p, refundShare: Math.round((refund - allocated) * 100) / 100 };
    }
    const share = Math.round(refund * (p.amount / payTotal) * 100) / 100;
    allocated += share;
    return { ...p, refundShare: share };
  });
}

module.exports = {
  derivePaymentFields,
  restockQtyAfterReturns,
  allocateProportionalRefund,
};
