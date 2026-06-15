const BaseRepository = require('../../shared/base.repository');
const db = require('../../config/database');

class BusinessRepository extends BaseRepository {
  constructor() {
    super('tenants', false);
  }

  async findAllWithDetails({ page, limit, status, search }) {
    const offset = (page - 1) * limit;
    const conditions = ["t.status != 'deleted'"];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(t.name ILIKE $${idx} OR t.email ILIKE $${idx} OR t.slug ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM tenants t ${where}`,
      params
    );

    const result = await db.query(
      `SELECT t.*,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.email AS owner_email,
              p.name AS plan_name,
              s.status AS subscription_status,
              s.current_period_end AS expiry_date,
              td.domain AS subdomain
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.name = 'business_owner'
       LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status IN ('active', 'trialing')
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN tenant_domains td ON td.tenant_id = t.id AND td.is_primary = true
       ${where}
       GROUP BY t.id, u.first_name, u.last_name, u.email, p.name, s.status, s.current_period_end, td.domain
       ORDER BY t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return { rows: result.rows, total: countResult.rows[0].total };
  }

  async getPlatformStats() {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM tenants WHERE status != 'deleted') AS total_businesses,
        (SELECT COUNT(*)::int FROM tenants WHERE status = 'active') AS active_businesses,
        (SELECT COUNT(*)::int FROM tenants WHERE status = 'suspended') AS suspended_businesses,
        (SELECT COUNT(*)::int FROM tenants WHERE status = 'trial') AS trial_businesses,
        (SELECT COUNT(*)::int FROM tenants WHERE status = 'expired') AS expired_businesses,
        (SELECT COUNT(*)::int FROM users WHERE status = 'active') AS total_users,
        (SELECT COUNT(*)::int FROM products) AS total_products,
        (SELECT COUNT(*)::int FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders WHERE status IN ('paid', 'completed')) AS total_revenue,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders WHERE status IN ('paid', 'completed') AND created_at >= date_trunc('month', NOW())) AS monthly_revenue,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders WHERE status IN ('paid', 'completed') AND created_at >= date_trunc('year', NOW())) AS annual_revenue,
        (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'active') AS active_subscriptions,
        (SELECT COUNT(*)::int FROM subscriptions WHERE current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days') AS expiring_subscriptions
    `);
    return stats.rows[0];
  }

  async getGrowthData(months = 12) {
    const revenue = await db.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
             COALESCE(SUM(total), 0)::numeric AS revenue
      FROM invoices WHERE status = 'paid' AND created_at >= NOW() - ($1 || ' months')::interval
      GROUP BY 1 ORDER BY 1
    `, [months]);

    const businesses = await db.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
             COUNT(*)::int AS count
      FROM tenants WHERE status != 'deleted' AND created_at >= NOW() - ($1 || ' months')::interval
      GROUP BY 1 ORDER BY 1
    `, [months]);

    return { revenue: revenue.rows, businesses: businesses.rows };
  }
}

module.exports = new BusinessRepository();
