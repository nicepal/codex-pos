function computeChangePercent(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function buildKpi(value, previous, comparisonLabel = 'vs Previous') {
  const v = Number(value) || 0;
  const p = Number(previous) || 0;
  const changePercent = computeChangePercent(v, p);
  let trend = 'flat';
  if (changePercent > 0) trend = 'up';
  else if (changePercent < 0) trend = 'down';
  return { value: v, previous: p, changePercent, comparisonLabel, trend };
}

const RANGE_CONFIG = {
  today: { days: 1, trunc: 'hour', interval: '1 hour', comparisonLabel: 'vs Yesterday' },
  '7d': { days: 7, trunc: 'day', interval: '1 day', comparisonLabel: 'vs Prior 7 Days' },
  '30d': { days: 30, trunc: 'day', interval: '1 day', comparisonLabel: 'vs Prior 30 Days' },
  '90d': { days: 90, trunc: 'week', interval: '1 week', comparisonLabel: 'vs Prior 90 Days' },
  '1y': { days: 365, trunc: 'month', interval: '1 month', comparisonLabel: 'vs Prior Year' },
};

function resolveRange(range = '30d') {
  const key = RANGE_CONFIG[range] ? range : '30d';
  return { key, ...RANGE_CONFIG[key] };
}

function buildFinancialPeriod(revenue, expenses, previousRevenue) {
  const rev = Number(revenue) || 0;
  const exp = Number(expenses) || 0;
  const profit = rev - exp;
  const marginPct = rev > 0 ? Math.round((profit / rev) * 1000) / 10 : 0;
  return {
    revenue: rev,
    expenses: exp,
    profit,
    marginPct,
    previousRevenue: Number(previousRevenue) || 0,
    changePercent: computeChangePercent(rev, previousRevenue),
  };
}

function groupNotifications(rows) {
  const groups = { inventory: [], orders: [], payments: [], subscription: [] };
  for (const row of rows) {
    const type = (row.type || '').toLowerCase();
    const item = {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
    if (type.includes('stock') || type.includes('inventory')) {
      groups.inventory.push(item);
    } else if (type.includes('order')) {
      groups.orders.push(item);
    } else if (type.includes('payment') || type.includes('billing')) {
      groups.payments.push(item);
    } else if (type.includes('subscription') || type.includes('plan')) {
      groups.subscription.push(item);
    } else {
      groups.orders.push(item);
    }
  }
  return groups;
}

module.exports = {
  computeChangePercent,
  buildKpi,
  resolveRange,
  buildFinancialPeriod,
  groupNotifications,
};
