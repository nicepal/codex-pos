const db = require('../config/database');
const { ForbiddenError } = require('./errors');

async function getCurrentPlan(tenantId) {
  const result = await db.query(
    `SELECT p.product_limit, p.user_limit, p.branch_limit
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY s.created_at DESC LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || { product_limit: 100, user_limit: 2, branch_limit: 1 };
}

async function checkLimit(tenantId, resource) {
  const plan = await getCurrentPlan(tenantId);
  const limits = {
    products: { column: 'product_limit', table: 'products', filter: "status != 'deleted'" },
    users: { column: 'user_limit', table: 'users', filter: "status = 'active'" },
    branches: { column: 'branch_limit', table: 'branches', filter: "status = 'active'" },
  };

  const cfg = limits[resource];
  if (!cfg) return;

  const limit = plan[cfg.column];
  if (limit === -1 || limit === null) return;

  const count = await db.query(
    `SELECT COUNT(*)::int AS c FROM ${cfg.table} WHERE tenant_id = $1 AND ${cfg.filter}`,
    [tenantId]
  );

  if (count.rows[0].c >= limit) {
    throw new ForbiddenError(`Plan limit reached for ${resource}. Please upgrade your subscription.`);
  }
}

module.exports = { getCurrentPlan, checkLimit };
