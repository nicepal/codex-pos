const db = require('../config/database');
const { ForbiddenError } = require('./errors');

async function getCurrentPlan(tenantId) {
  const result = await db.query(
    `SELECT p.product_limit, p.user_limit, p.branch_limit, p.transaction_limit, p.storage_limit_mb,
            s.current_period_start, s.current_period_end
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY s.created_at DESC LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || {
    product_limit: 100, user_limit: 2, branch_limit: 1, transaction_limit: 500, storage_limit_mb: 512,
  };
}

const COUNT_LIMITS = {
  products: { column: 'product_limit', table: 'products', filter: "status != 'deleted'" },
  users: { column: 'user_limit', table: 'users', filter: "status = 'active'" },
  branches: { column: 'branch_limit', table: 'branches', filter: "status = 'active'" },
};

function unlimited(limit) {
  return limit === -1 || limit === null || limit === undefined;
}

async function checkLimit(tenantId, resource) {
  const plan = await getCurrentPlan(tenantId);
  const cfg = COUNT_LIMITS[resource];
  if (!cfg) return;

  const limit = plan[cfg.column];
  if (unlimited(limit)) return;

  const count = await db.query(
    `SELECT COUNT(*)::int AS c FROM ${cfg.table} WHERE tenant_id = $1 AND ${cfg.filter}`,
    [tenantId]
  );

  if (count.rows[0].c >= limit) {
    throw new ForbiddenError(`Plan limit reached for ${resource}. Please upgrade your subscription.`);
  }
}

function periodStart(plan) {
  // Use the subscription period when available, otherwise the current month
  if (plan.current_period_start) return new Date(plan.current_period_start);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function countTransactionsThisPeriod(tenantId, plan) {
  const start = periodStart(plan);
  const result = await db.query(
    `SELECT COUNT(*)::int AS c FROM orders
     WHERE tenant_id = $1 AND created_at >= $2 AND status NOT IN ('on_hold', 'cancelled')`,
    [tenantId, start]
  );
  return result.rows[0].c;
}

async function checkTransactionLimit(tenantId) {
  const plan = await getCurrentPlan(tenantId);
  const limit = plan.transaction_limit;
  if (unlimited(limit)) return;
  const used = await countTransactionsThisPeriod(tenantId, plan);
  if (used >= limit) {
    throw new ForbiddenError('Monthly transaction limit reached for your plan. Please upgrade your subscription.');
  }
}

async function getStorageBytes(tenantId) {
  const result = await db.query('SELECT storage_bytes FROM tenant_usage WHERE tenant_id = $1', [tenantId]);
  return Number(result.rows[0]?.storage_bytes || 0);
}

async function addStorageBytes(tenantId, bytes) {
  await db.query(
    `INSERT INTO tenant_usage (tenant_id, storage_bytes, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET storage_bytes = GREATEST(0, tenant_usage.storage_bytes + $2), updated_at = NOW()`,
    [tenantId, Math.round(bytes)]
  );
}

async function checkStorageLimit(tenantId, incomingBytes = 0) {
  const plan = await getCurrentPlan(tenantId);
  const limitMb = plan.storage_limit_mb;
  if (unlimited(limitMb)) return;
  const used = await getStorageBytes(tenantId);
  if (used + incomingBytes > limitMb * 1024 * 1024) {
    throw new ForbiddenError('Storage limit reached for your plan. Please upgrade or free up space.');
  }
}

async function getUsageSummary(tenantId) {
  const plan = await getCurrentPlan(tenantId);
  const [products, users, branches, transactions, storage] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS c FROM products WHERE tenant_id = $1 AND status != 'deleted'`, [tenantId]),
    db.query(`SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1 AND status = 'active'`, [tenantId]),
    db.query(`SELECT COUNT(*)::int AS c FROM branches WHERE tenant_id = $1 AND status = 'active'`, [tenantId]),
    countTransactionsThisPeriod(tenantId, plan),
    getStorageBytes(tenantId),
  ]);

  const fmt = (used, limit) => ({ used, limit: unlimited(limit) ? null : limit });
  return {
    period_start: periodStart(plan),
    products: fmt(products.rows[0].c, plan.product_limit),
    users: fmt(users.rows[0].c, plan.user_limit),
    branches: fmt(branches.rows[0].c, plan.branch_limit),
    transactions: fmt(transactions, plan.transaction_limit),
    storage_mb: fmt(+(storage / (1024 * 1024)).toFixed(2), plan.storage_limit_mb),
  };
}

module.exports = {
  getCurrentPlan,
  checkLimit,
  checkTransactionLimit,
  checkStorageLimit,
  addStorageBytes,
  getStorageBytes,
  getUsageSummary,
};
