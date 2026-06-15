const db = require('../../config/database');

class ReportService {
  async businessDashboard(tenantId) {
    const stats = await db.query(`
      SELECT
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed') AND created_at >= CURRENT_DATE) AS today_sales,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed') AND created_at >= date_trunc('month', NOW())) AS monthly_sales,
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = $1 AND created_at >= CURRENT_DATE) AS today_orders,
        (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1) AS total_customers,
        (SELECT COALESCE(SUM(stock_quantity * cost_price), 0)::numeric FROM products WHERE tenant_id = $1) AS inventory_value,
        (SELECT COUNT(*)::int FROM products WHERE tenant_id = $1 AND stock_quantity <= low_stock_threshold) AS low_stock_count
    `, [tenantId]);

    const monthlyExpenses = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses
       WHERE tenant_id = $1 AND expense_date >= date_trunc('month', NOW())`,
      [tenantId]
    );

    const row = stats.rows[0];
    const expenses = parseFloat(monthlyExpenses.rows[0].total);
    const revenue = parseFloat(row.monthly_sales);

    return {
      ...row,
      monthly_expenses: expenses,
      profit_loss: revenue - expenses,
    };
  }

  async salesReport(tenantId, { period = 'daily', from, to }) {
    const trunc = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[period] || 'day';

    const result = await db.query(
      `SELECT date_trunc($1, created_at) AS period,
              COUNT(*)::int AS order_count,
              COALESCE(SUM(total_amount), 0)::numeric AS revenue
       FROM orders
       WHERE tenant_id = $2 AND status IN ('paid', 'completed')
         AND created_at BETWEEN COALESCE($3::timestamptz, NOW() - INTERVAL '30 days') AND COALESCE($4::timestamptz, NOW())
       GROUP BY 1 ORDER BY 1`,
      [trunc, tenantId, from, to]
    );
    return result.rows;
  }

  async topProducts(tenantId, limit = 10) {
    const result = await db.query(
      `SELECT oi.product_name, oi.product_id, SUM(oi.quantity)::int AS total_qty,
              SUM(oi.total)::numeric AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.tenant_id = $1 AND o.status IN ('paid', 'completed')
       GROUP BY oi.product_name, oi.product_id
       ORDER BY total_qty DESC LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows;
  }

  async inventoryReport(tenantId) {
    const [value, lowStock] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS product_count,
                COALESCE(SUM(stock_quantity), 0)::int AS total_units,
                COALESCE(SUM(stock_quantity * cost_price), 0)::numeric AS total_value,
                COALESCE(SUM(stock_quantity * sale_price), 0)::numeric AS retail_value
         FROM products WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId]
      ),
      db.query(
        `SELECT id, name, sku, stock_quantity, low_stock_threshold
         FROM products WHERE tenant_id = $1 AND stock_quantity <= low_stock_threshold
         ORDER BY stock_quantity LIMIT 50`,
        [tenantId]
      ),
    ]);

    return { summary: value.rows[0], lowStock: lowStock.rows };
  }

  async advancedAnalytics(tenantId) {
    const [hourly, employees, categories] = await Promise.all([
      db.query(
        `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS orders, COALESCE(SUM(total_amount),0)::numeric AS revenue
         FROM orders WHERE tenant_id = $1 AND status IN ('paid','completed') AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1 ORDER BY 1`,
        [tenantId]
      ),
      db.query(
        `SELECT e.name, COUNT(o.id)::int AS orders, COALESCE(SUM(o.total_amount),0)::numeric AS revenue
         FROM orders o JOIN employees e ON e.id = o.employee_id
         WHERE o.tenant_id = $1 AND o.status IN ('paid','completed')
         GROUP BY e.name ORDER BY revenue DESC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT c.name, SUM(oi.quantity)::int AS qty, COALESCE(SUM(oi.total),0)::numeric AS revenue
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE oi.tenant_id = $1 GROUP BY c.name ORDER BY revenue DESC LIMIT 10`,
        [tenantId]
      ),
    ]);
    return { hourly: hourly.rows, byEmployee: employees.rows, byCategory: categories.rows };
  }

  async financialReport(tenantId, from, to) {
    const [revenue, expenses] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at BETWEEN COALESCE($2::timestamptz, date_trunc('month', NOW())) AND COALESCE($3::timestamptz, NOW())`,
        [tenantId, from, to]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses
         WHERE tenant_id = $1 AND expense_date BETWEEN COALESCE($2::date, date_trunc('month', NOW())::date) AND COALESCE($3::date, NOW()::date)`,
        [tenantId, from, to]
      ),
    ]);

    const rev = parseFloat(revenue.rows[0].total);
    const exp = parseFloat(expenses.rows[0].total);
    return { revenue: rev, expenses: exp, profit: rev - exp, loss: exp > rev ? exp - rev : 0 };
  }
}

module.exports = new ReportService();
