const db = require('../../config/database');
const {
  buildKpi,
  resolveRange,
  buildFinancialPeriod,
  groupNotifications,
} = require('./dashboard.helpers');

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

  async exportSalesCsv(tenantId, { from, to }) {
    const rows = await this.salesReport(tenantId, { period: 'daily', from, to });
    const header = 'period,order_count,revenue\n';
    const body = rows.map((r) => `${r.period},${r.order_count},${r.revenue}`).join('\n');
    return header + body;
  }

  async scheduleReport(tenantId, data) {
    const result = await db.query(
      `INSERT INTO scheduled_reports (tenant_id, report_type, schedule, email, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [tenantId, data.report_type, data.schedule, data.email]
    );
    return result.rows[0];
  }

  async exportTenantData(tenantId) {
    const [products, customers, orders] = await Promise.all([
      db.query('SELECT id, name, sku, sale_price, stock_quantity FROM products WHERE tenant_id = $1', [tenantId]),
      db.query('SELECT id, name, email, phone FROM customers WHERE tenant_id = $1', [tenantId]),
      db.query('SELECT id, order_number, total_amount, status, created_at FROM orders WHERE tenant_id = $1 LIMIT 1000', [tenantId]),
    ]);
    return { products: products.rows, customers: customers.rows, orders: orders.rows, exported_at: new Date().toISOString() };
  }

  async dashboardOverview(tenantId, range = '30d') {
    const rangeConfig = resolveRange(range);

    const [
      kpiRows,
      chartRows,
      topProducts,
      inventorySummary,
      lowStock,
      outOfStock,
      overstocked,
      recentMovements,
      recentOrders,
      alertCounts,
      customerStats,
      topCustomers,
      activityRows,
      notificationRows,
      subscription,
      monthFinancial,
      yearFinancial,
    ] = await Promise.all([
      this._dashboardKpiQueries(tenantId),
      this._dashboardChartQueries(tenantId, rangeConfig),
      this.topProducts(tenantId, 10),
      db.query(
        `SELECT COUNT(*)::int AS product_count,
                COALESCE(SUM(stock_quantity * cost_price), 0)::numeric AS total_value,
                COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold)::int AS low_stock_count,
                COUNT(*) FILTER (WHERE stock_quantity = 0)::int AS out_of_stock_count,
                COUNT(*) FILTER (WHERE stock_quantity > GREATEST(low_stock_threshold * 5, 50))::int AS overstocked_count
         FROM products WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId]
      ),
      db.query(
        `SELECT id, name, sku, stock_quantity, low_stock_threshold
         FROM products WHERE tenant_id = $1 AND stock_quantity > 0 AND stock_quantity <= low_stock_threshold
         ORDER BY stock_quantity ASC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT id, name, sku, stock_quantity, low_stock_threshold
         FROM products WHERE tenant_id = $1 AND stock_quantity = 0 AND status = 'active'
         ORDER BY name ASC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT id, name, sku, stock_quantity, low_stock_threshold
         FROM products WHERE tenant_id = $1 AND stock_quantity > GREATEST(low_stock_threshold * 5, 50)
         ORDER BY stock_quantity DESC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT it.transaction_type AS type, p.name AS product_name, it.quantity, it.created_at
         FROM inventory_transactions it
         LEFT JOIN products p ON p.id = it.product_id
         WHERE it.tenant_id = $1
         ORDER BY it.created_at DESC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
                COALESCE(c.name, 'Walk-in') AS customer_name
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.tenant_id = $1
         ORDER BY o.created_at DESC LIMIT 10`,
        [tenantId]
      ),
      this._dashboardAlertCounts(tenantId),
      this._dashboardCustomerStats(tenantId),
      db.query(
        `SELECT c.id, c.name, COUNT(o.id)::int AS order_count,
                COALESCE(SUM(o.total_amount), 0)::numeric AS total_spent
         FROM customers c
         JOIN orders o ON o.customer_id = c.id AND o.status IN ('paid', 'completed')
         WHERE c.tenant_id = $1
         GROUP BY c.id, c.name
         ORDER BY total_spent DESC LIMIT 5`,
        [tenantId]
      ),
      this._dashboardActivity(tenantId),
      db.query(
        `SELECT id, type, title, message, read_at, created_at
         FROM notifications WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [tenantId]
      ),
      db.query(
        `SELECT s.status, s.current_period_end, p.name AS plan_name
         FROM subscriptions s JOIN plans p ON p.id = s.plan_id
         WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
         ORDER BY s.created_at DESC LIMIT 1`,
        [tenantId]
      ),
      this._financialPeriodComparison(tenantId, 'month'),
      this._financialPeriodComparison(tenantId, 'year'),
    ]);

    const k = kpiRows;
    const inv = inventorySummary.rows[0];
    const alerts = this._buildAlerts(alertCounts, subscription.rows[0], inv);
    const sub = subscription.rows[0];
    const daysUntilExpiry = sub?.current_period_end
      ? Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const mapProduct = (row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      stockQuantity: Number(row.stock_quantity),
      lowStockThreshold: Number(row.low_stock_threshold),
    });

    return {
      kpis: {
        todaySales: buildKpi(k.today_sales, k.yesterday_sales, 'vs Yesterday'),
        todayProfit: buildKpi(k.today_profit, k.yesterday_profit, 'vs Yesterday'),
        todayOrders: buildKpi(k.today_orders, k.yesterday_orders, 'vs Yesterday'),
        customersToday: buildKpi(k.customers_today, k.customers_yesterday, 'vs Yesterday'),
        inventoryValue: buildKpi(k.inventory_value, k.inventory_value_prev, 'vs Last Month'),
        monthlyRevenue: buildKpi(k.monthly_sales, k.prev_monthly_sales, 'vs Last Month'),
        monthlyExpenses: buildKpi(k.monthly_expenses, k.prev_monthly_expenses, 'vs Last Month'),
        netProfit: buildKpi(k.net_profit, k.prev_net_profit, 'vs Last Month'),
      },
      alerts,
      charts: chartRows,
      topProducts: topProducts.map((p) => ({
        productId: p.product_id,
        productName: p.product_name,
        unitsSold: Number(p.total_qty),
        revenue: Number(p.total_revenue),
      })),
      inventory: {
        summary: {
          totalValue: Number(inv.total_value),
          lowStockCount: Number(inv.low_stock_count),
          outOfStockCount: Number(inv.out_of_stock_count),
          overstockedCount: Number(inv.overstocked_count),
        },
        lowStock: lowStock.rows.map(mapProduct),
        outOfStock: outOfStock.rows.map(mapProduct),
        overstocked: overstocked.rows.map(mapProduct),
        recentMovements: recentMovements.rows.map((r) => ({
          type: r.type,
          productName: r.product_name,
          quantity: Number(r.quantity),
          createdAt: r.created_at,
        })),
      },
      recentOrders: recentOrders.rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        totalAmount: Number(o.total_amount),
        status: o.status,
        createdAt: o.created_at,
      })),
      financial: {
        month: monthFinancial,
        year: yearFinancial,
      },
      customers: {
        newToday: Number(customerStats.new_today),
        returningToday: Number(customerStats.returning_today),
        newThisMonth: Number(customerStats.new_this_month),
        growthPercent: buildKpi(customerStats.new_this_month, customerStats.new_prev_month, 'vs Last Month').changePercent,
        topCustomers: topCustomers.rows.map((c) => ({
          id: c.id,
          name: c.name,
          orderCount: Number(c.order_count),
          totalSpent: Number(c.total_spent),
        })),
      },
      activity: activityRows,
      notifications: groupNotifications(notificationRows.rows),
      subscription: sub ? {
        planName: sub.plan_name,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        daysUntilExpiry,
      } : null,
      range: rangeConfig.key,
      generatedAt: new Date().toISOString(),
    };
  }

  async _dashboardKpiQueries(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed') AND created_at >= CURRENT_DATE) AS today_sales,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) AS yesterday_sales,
        (SELECT COALESCE(SUM(oi.total - oi.quantity * COALESCE(p.cost_price, 0)), 0)::numeric
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid','completed') AND o.created_at >= CURRENT_DATE) AS today_profit,
        (SELECT COALESCE(SUM(oi.total - oi.quantity * COALESCE(p.cost_price, 0)), 0)::numeric
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid','completed')
           AND o.created_at >= CURRENT_DATE - INTERVAL '1 day' AND o.created_at < CURRENT_DATE) AS yesterday_profit,
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = $1 AND created_at >= CURRENT_DATE) AS today_orders,
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = $1
           AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) AS yesterday_orders,
        (SELECT COUNT(*)::int FROM (
           SELECT DISTINCT customer_id FROM orders
           WHERE tenant_id = $1 AND created_at >= CURRENT_DATE AND customer_id IS NOT NULL
           UNION
           SELECT id FROM customers WHERE tenant_id = $1 AND created_at >= CURRENT_DATE
         ) t) AS customers_today,
        (SELECT COUNT(*)::int FROM (
           SELECT DISTINCT customer_id FROM orders
           WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '1 day'
             AND created_at < CURRENT_DATE AND customer_id IS NOT NULL
           UNION
           SELECT id FROM customers WHERE tenant_id = $1
             AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE
         ) t) AS customers_yesterday,
        (SELECT COALESCE(SUM(stock_quantity * cost_price), 0)::numeric FROM products WHERE tenant_id = $1) AS inventory_value,
        (SELECT COALESCE(SUM(stock_quantity * cost_price), 0)::numeric FROM products WHERE tenant_id = $1) AS inventory_value_prev,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed') AND created_at >= date_trunc('month', NOW())) AS monthly_sales,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
           AND created_at < date_trunc('month', NOW())) AS prev_monthly_sales,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses
         WHERE tenant_id = $1 AND expense_date >= date_trunc('month', NOW())::date) AS monthly_expenses,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses
         WHERE tenant_id = $1 AND expense_date >= date_trunc('month', NOW() - INTERVAL '1 month')::date
           AND expense_date < date_trunc('month', NOW())::date) AS prev_monthly_expenses`,
      [tenantId]
    );
    const row = result.rows[0];
    const netProfit = parseFloat(row.monthly_sales) - parseFloat(row.monthly_expenses);
    const prevNetProfit = parseFloat(row.prev_monthly_sales) - parseFloat(row.prev_monthly_expenses);
    return { ...row, net_profit: netProfit, prev_net_profit: prevNetProfit };
  }

  async _dashboardChartQueries(tenantId, rangeConfig) {
    const trunc = rangeConfig.trunc;
    const days = rangeConfig.days;
    const intervalSql = rangeConfig.interval;

    const series = await db.query(
      `WITH periods AS (
         SELECT generate_series(
           date_trunc($2::text, NOW() - ($3::text || ' days')::interval),
           date_trunc($2::text, NOW()),
           $4::interval
         ) AS period
       ),
       revenue AS (
         SELECT date_trunc($2::text, created_at) AS period,
                COUNT(*)::int AS orders,
                COALESCE(SUM(total_amount), 0)::numeric AS revenue
         FROM orders
         WHERE tenant_id = $1 AND status IN ('paid', 'completed')
           AND created_at >= NOW() - ($3::text || ' days')::interval
         GROUP BY 1
       ),
       expenses AS (
         SELECT date_trunc($2::text, expense_date::timestamptz) AS period,
                COALESCE(SUM(amount), 0)::numeric AS expenses
         FROM expenses
         WHERE tenant_id = $1 AND expense_date >= (NOW() - ($3::text || ' days')::interval)::date
         GROUP BY 1
       )
       SELECT p.period,
              COALESCE(r.revenue, 0)::numeric AS revenue,
              COALESCE(r.orders, 0)::int AS orders,
              COALESCE(e.expenses, 0)::numeric AS expenses
       FROM periods p
       LEFT JOIN revenue r ON r.period = p.period
       LEFT JOIN expenses e ON e.period = p.period
       ORDER BY p.period`,
      [tenantId, trunc, String(days), intervalSql]
    );

    const salesTrend = series.rows.map((r) => ({
      period: r.period,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }));

    const revenueVsExpenses = series.rows.map((r) => ({
      period: r.period,
      revenue: Number(r.revenue),
      expenses: Number(r.expenses),
    }));

    const profitTrend = series.rows.map((r) => {
      const revenue = Number(r.revenue);
      const expenses = Number(r.expenses);
      const profit = revenue - expenses;
      return {
        period: r.period,
        profit,
        marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      };
    });

    return { salesTrend, revenueVsExpenses, profitTrend };
  }

  async _dashboardAlertCounts(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM products WHERE tenant_id = $1
           AND stock_quantity > 0 AND stock_quantity <= low_stock_threshold) AS low_stock,
        (SELECT COUNT(*)::int FROM products WHERE tenant_id = $1 AND stock_quantity = 0 AND status = 'active') AS out_of_stock,
        (SELECT COUNT(*)::int FROM purchase_orders WHERE tenant_id = $1 AND status IN ('draft', 'ordered')) AS pending_pos,
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = $1
           AND (status IN ('pending', 'on_hold') OR payment_status = 'pending')) AS pending_payments,
        (SELECT COUNT(*)::int FROM payment_checkout_sessions WHERE tenant_id = $1
           AND status = 'failed' AND created_at >= NOW() - INTERVAL '7 days') AS failed_transactions`,
      [tenantId]
    );
    return result.rows[0];
  }

  _buildAlerts(counts, subscription, inventory) {
    const alerts = [];
    const c = counts;

    if (Number(c.out_of_stock) > 0) {
      alerts.push({
        id: 'out-of-stock',
        severity: 'critical',
        type: 'out_of_stock',
        title: 'Out of Stock Products',
        count: Number(c.out_of_stock),
        href: '/inventory',
      });
    }
    if (Number(c.low_stock) > 0) {
      alerts.push({
        id: 'low-stock',
        severity: 'warning',
        type: 'low_stock',
        title: 'Low Stock Products',
        count: Number(c.low_stock),
        href: '/inventory',
      });
    }
    if (Number(c.pending_pos) > 0) {
      alerts.push({
        id: 'pending-pos',
        severity: 'warning',
        type: 'pending_po',
        title: 'Pending Purchase Orders',
        count: Number(c.pending_pos),
        href: '/purchase-orders',
      });
    }
    if (Number(c.pending_payments) > 0) {
      alerts.push({
        id: 'pending-payments',
        severity: 'warning',
        type: 'pending_payment',
        title: 'Orders Requiring Payment',
        count: Number(c.pending_payments),
        href: '/orders?status=pending',
      });
    }
    if (Number(c.failed_transactions) > 0) {
      alerts.push({
        id: 'failed-transactions',
        severity: 'critical',
        type: 'failed_transaction',
        title: 'Failed Transactions',
        count: Number(c.failed_transactions),
        href: '/settings/subscription',
      });
    }
    if (subscription?.current_period_end) {
      const days = Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));
      if (days <= 7 && days >= 0) {
        alerts.push({
          id: 'subscription-expiry',
          severity: days <= 3 ? 'critical' : 'warning',
          type: 'subscription_expiry',
          title: 'Subscription Expiring Soon',
          count: days,
          href: '/settings/subscription',
        });
      }
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'all-clear',
        severity: 'good',
        type: 'all_clear',
        title: 'All clear — no actions needed',
        count: 0,
        href: null,
      });
    }
    return alerts;
  }

  async _dashboardCustomerStats(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1 AND created_at >= CURRENT_DATE) AS new_today,
        (SELECT COUNT(DISTINCT o.customer_id)::int FROM orders o
         WHERE o.tenant_id = $1 AND o.created_at >= CURRENT_DATE AND o.customer_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM orders prev
             WHERE prev.tenant_id = $1 AND prev.customer_id = o.customer_id
               AND prev.created_at < CURRENT_DATE AND prev.status IN ('paid', 'completed')
           )) AS returning_today,
        (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW())) AS new_this_month,
        (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
           AND created_at < date_trunc('month', NOW())) AS new_prev_month`,
      [tenantId]
    );
    return result.rows[0];
  }

  async _dashboardActivity(tenantId) {
    const result = await db.query(
      `(SELECT o.id::text, 'sale' AS type, 'Sale completed' AS title,
              o.order_number AS description, o.created_at,
              '/orders/' || o.id::text AS href
       FROM orders o
       WHERE o.tenant_id = $1 AND o.status IN ('paid', 'completed')
       ORDER BY o.created_at DESC LIMIT 5)
       UNION ALL
       (SELECT p.id::text, 'product' AS type, 'Product added' AS title,
              p.name AS description, p.created_at,
              '/products' AS href
       FROM products p WHERE p.tenant_id = $1
       ORDER BY p.created_at DESC LIMIT 5)
       UNION ALL
       (SELECT it.id::text, 'stock' AS type, 'Stock updated' AS title,
              COALESCE(pr.name, 'Product') AS description, it.created_at,
              '/inventory' AS href
       FROM inventory_transactions it
       LEFT JOIN products pr ON pr.id = it.product_id
       WHERE it.tenant_id = $1
       ORDER BY it.created_at DESC LIMIT 5)
       UNION ALL
       (SELECT po.id::text, 'purchase_order' AS type, 'Purchase order created' AS title,
              po.po_number AS description, po.created_at,
              '/purchase-orders/' || po.id::text AS href
       FROM purchase_orders po WHERE po.tenant_id = $1
       ORDER BY po.created_at DESC LIMIT 5)
       UNION ALL
       (SELECT c.id::text, 'customer' AS type, 'Customer added' AS title,
              c.name AS description, c.created_at,
              '/customers' AS href
       FROM customers c WHERE c.tenant_id = $1
       ORDER BY c.created_at DESC LIMIT 5)
       ORDER BY created_at DESC LIMIT 20`,
      [tenantId]
    );
    return result.rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      createdAt: r.created_at,
      href: r.href,
    }));
  }

  async _financialPeriodComparison(tenantId, period) {
    if (period === 'month') {
      const [current, previous] = await Promise.all([
        db.query(
          `SELECT
            (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
             WHERE tenant_id = $1 AND status IN ('paid','completed')
               AND created_at >= date_trunc('month', NOW())) AS revenue,
            (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses
             WHERE tenant_id = $1 AND expense_date >= date_trunc('month', NOW())::date) AS expenses`,
          [tenantId]
        ),
        db.query(
          `SELECT COALESCE(SUM(total_amount), 0)::numeric AS revenue FROM orders
           WHERE tenant_id = $1 AND status IN ('paid','completed')
             AND created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
             AND created_at < date_trunc('month', NOW())`,
          [tenantId]
        ),
      ]);
      const cur = current.rows[0];
      return buildFinancialPeriod(cur.revenue, cur.expenses, previous.rows[0].revenue);
    }

    const [current, previous] = await Promise.all([
      db.query(
        `SELECT
          (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
           WHERE tenant_id = $1 AND status IN ('paid','completed')
             AND created_at >= date_trunc('year', NOW())) AS revenue,
          (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses
           WHERE tenant_id = $1 AND expense_date >= date_trunc('year', NOW())::date) AS expenses`,
        [tenantId]
      ),
      db.query(
        `SELECT COALESCE(SUM(total_amount), 0)::numeric AS revenue FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('year', NOW() - INTERVAL '1 year')
           AND created_at < date_trunc('year', NOW())`,
        [tenantId]
      ),
    ]);
    const cur = current.rows[0];
    return buildFinancialPeriod(cur.revenue, cur.expenses, previous.rows[0].revenue);
  }
}

module.exports = new ReportService();
