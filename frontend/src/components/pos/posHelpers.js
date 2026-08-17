/**
 * Shared POS helpers — employee labels, money presets.
 */

export function employeeLabel(e) {
  if (!e) return 'Employee';
  return e.name
    || `${e.first_name || ''} ${e.last_name || ''}`.trim()
    || e.email
    || 'Employee';
}

/** Cashiers with manager/admin/supervisor role for discount overrides. */
export function managerEmployees(employees = []) {
  const roles = new Set(['manager', 'admin', 'supervisor', 'owner']);
  const managers = (employees || []).filter((e) => roles.has(String(e.role || '').toLowerCase()));
  return managers.length ? managers : (employees || []);
}

export function cashQuickAmounts(grandTotal) {
  const due = Math.max(0, Number(grandTotal) || 0);
  const rounded = Math.ceil(due);
  const presets = new Set([due, rounded]);
  [5, 10, 20, 50, 100].forEach((n) => {
    if (n >= due) presets.add(n);
  });
  // Next round tens / fifties above due
  if (due > 0) {
    presets.add(Math.ceil(due / 10) * 10);
    presets.add(Math.ceil(due / 20) * 20);
    presets.add(Math.ceil(due / 50) * 50);
  }
  return Array.from(presets)
    .filter((n) => Number.isFinite(n) && n >= due)
    .sort((a, b) => a - b)
    .slice(0, 6)
    .map((n) => Number(n.toFixed(2)));
}

/** Build SaleReceipt-compatible data for offline / pending-sync sales. */
export function buildOfflineReceiptData({
  items = [],
  discount = 0,
  taxAmount = 0,
  tipAmount = 0,
  grandTotal = 0,
  customer = null,
  tenant = null,
  user = null,
  payload = {},
  localId = null,
  footer = null,
}) {
  const lineItems = items.map((i) => {
    const unitPrice = i.open_price != null ? i.open_price : i.unit_price;
    const lineDisc = i.line_discount || 0;
    let productName = i.product_name || 'Item';
    if (i.variant_name) productName = `${productName} - ${i.variant_name}`;
    return {
      product_name: productName,
      variant_id: i.variant_id || null,
      quantity: i.quantity,
      unit_price: unitPrice,
      total: unitPrice * i.quantity - lineDisc,
    };
  });

  const subtotal = lineItems.reduce((sum, line) => sum + line.total, 0);
  const payments = (payload.payments || []).map((p) => ({
    payment_method: p.method,
    amount: p.amount,
  }));
  const paymentMethod = payload.payment_method
    || (payments.length === 1 ? payments[0].payment_method : payments.length > 1 ? 'split' : null);

  return {
    business: { name: tenant?.name || 'CodexPOS' },
    order: {
      order_number: localId ? `OFFLINE-${String(localId).slice(-8).toUpperCase()}` : 'OFFLINE-PENDING',
      status: 'pending',
      subtotal,
      discount_amount: discount,
      tax_amount: taxAmount,
      tip_amount: tipAmount,
      total_amount: grandTotal,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      customer,
      created_by_user: user,
    },
    items: lineItems,
    payments,
    footer: footer || 'OFFLINE — PENDING SYNC. Not a server receipt until synced.',
    printed_at: new Date().toISOString(),
  };
}
