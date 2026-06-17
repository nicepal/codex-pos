const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');
const { resolveTenantFeatures, FEATURE_PACKS } = require('../../shared/features');
const reportService = require('../reports/reports.service');

function num(v) {
  return Number(v) || 0;
}

function growthPercent(current, previous) {
  const cur = num(current);
  const prev = num(previous);
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function salesPeriod(amount, previousAmount, label) {
  return {
    amount: num(amount),
    previousAmount: num(previousAmount),
    growthPercent: growthPercent(amount, previousAmount),
    growthLabel: label,
  };
}

class BusinessDashboardService {
  async getDashboard(tenantId) {
    const business = await this._getBusinessProfile(tenantId);
    if (!business) throw new NotFoundError('Business not found');

    const [
      kpis,
      salesAnalytics,
      orderAnalytics,
      inventoryAnalytics,
      customerAnalytics,
      productAnalytics,
      financialAnalytics,
      subscriptionAnalytics,
      usageAnalytics,
      recentOrders,
      recentPurchaseOrders,
      activities,
      systemHealth,
    ] = await Promise.all([
      this._getKpis(tenantId),
      this._getSalesAnalytics(tenantId),
      this._getOrderAnalytics(tenantId),
      this._getInventoryAnalytics(tenantId),
      this._getCustomerAnalytics(tenantId),
      this._getProductAnalytics(tenantId),
      this._getFinancialAnalytics(tenantId),
      this._getSubscriptionAnalytics(tenantId),
      this._getUsageAnalytics(tenantId),
      this._getRecentOrders(tenantId),
      this._getRecentPurchaseOrders(tenantId),
      reportService._dashboardActivity(tenantId),
      this._getSystemHealth(tenantId),
    ]);

    return {
      business,
      kpis,
      salesAnalytics,
      orderAnalytics,
      inventoryAnalytics,
      customerAnalytics,
      productAnalytics,
      financialAnalytics,
      subscriptionAnalytics,
      usageAnalytics,
      recentOrders,
      recentPurchaseOrders,
      activities,
      systemHealth,
    };
  }

  async _getBusinessProfile(tenantId) {
    const result = await db.query(
      `SELECT t.*,
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS owner_name,
              u.email AS owner_email,
              u.last_login_at,
              p.name AS plan_name,
              s.status AS subscription_status,
              s.current_period_start,
              s.current_period_end,
              td.domain AS primary_domain
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id
         AND u.id = (
           SELECT ur.user_id FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id AND r.name = 'business_owner'
           WHERE ur.tenant_id = t.id LIMIT 1
         )
       LEFT JOIN subscriptions s ON s.tenant_id = t.id
         AND s.id = (SELECT id FROM subscriptions WHERE tenant_id = t.id ORDER BY created_at DESC LIMIT 1)
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN tenant_domains td ON td.tenant_id = t.id AND td.is_primary = true
       WHERE t.id = $1`,
      [tenantId]
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logo_url,
      ownerName: row.owner_name?.trim() || null,
      ownerEmail: row.owner_email || row.email,
      email: row.email,
      phone: row.phone,
      address: [row.address, row.city, row.state, row.postal_code].filter(Boolean).join(', ') || null,
      country: row.country,
      timezone: row.timezone,
      currency: row.currency,
      status: row.status,
      planName: row.plan_name,
      subscriptionStatus: row.subscription_status,
      registeredAt: row.created_at,
      lastLoginAt: row.last_login_at,
      primaryDomain: row.primary_domain || `${row.slug}.poshive.store`,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      trialEndsAt: row.trial_ends_at,
    };
  }

  async _getKpis(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM products WHERE tenant_id = $1 AND status != 'deleted') AS total_products,
        (SELECT COUNT(*)::int FROM categories WHERE tenant_id = $1) AS total_categories,
        (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1) AS total_customers,
        (SELECT COUNT(*)::int FROM suppliers WHERE tenant_id = $1) AS total_suppliers,
        (SELECT COUNT(*)::int FROM employees WHERE tenant_id = $1) AS total_employees,
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = $1) AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid', 'completed')) AS total_sales,
        (SELECT COALESCE(SUM(oi.total - oi.quantity * COALESCE(p.cost_price, 0)), 0)::numeric
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid', 'completed')) AS total_profit,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses WHERE tenant_id = $1) AS total_expenses,
        (SELECT COALESCE(SUM(stock_quantity * cost_price), 0)::numeric FROM products WHERE tenant_id = $1) AS inventory_value`,
      [tenantId]
    );
    const r = result.rows[0];
    return {
      totalProducts: num(r.total_products),
      totalCategories: num(r.total_categories),
      totalCustomers: num(r.total_customers),
      totalSuppliers: num(r.total_suppliers),
      totalEmployees: num(r.total_employees),
      totalOrders: num(r.total_orders),
      totalSales: num(r.total_sales),
      totalProfit: num(r.total_profit),
      totalExpenses: num(r.total_expenses),
      inventoryValue: num(r.inventory_value),
    };
  }

  async _getSalesAnalytics(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed') AND created_at >= CURRENT_DATE) AS today,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) AS yesterday,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('week', NOW())) AS this_week,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('week', NOW() - INTERVAL '1 week')
           AND created_at < date_trunc('week', NOW())) AS prev_week,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('month', NOW())) AS this_month,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
           AND created_at < date_trunc('month', NOW())) AS prev_month,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('year', NOW())) AS this_year,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= date_trunc('year', NOW() - INTERVAL '1 year')
           AND created_at < date_trunc('year', NOW())) AS prev_year`,
      [tenantId]
    );
    const r = result.rows[0];
    return {
      today: salesPeriod(r.today, r.yesterday, 'vs yesterday'),
      thisWeek: salesPeriod(r.this_week, r.prev_week, 'vs last week'),
      thisMonth: salesPeriod(r.this_month, r.prev_month, 'vs last month'),
      thisYear: salesPeriod(r.this_year, r.prev_year, 'vs last year'),
    };
  }

  async _getOrderAnalytics(tenantId) {
    const [counts, chart] = await Promise.all([
      db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status IN ('pending', 'on_hold') OR payment_status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status IN ('paid', 'completed'))::int AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded
         FROM orders WHERE tenant_id = $1`,
        [tenantId]
      ),
      db.query(
        `SELECT status, COUNT(*)::int AS count
         FROM orders WHERE tenant_id = $1
         GROUP BY status ORDER BY count DESC`,
        [tenantId]
      ),
    ]);
    const c = counts.rows[0];
    return {
      pending: num(c.pending),
      completed: num(c.completed),
      cancelled: num(c.cancelled),
      refunded: num(c.refunded),
      chart: chart.rows.map((row) => ({ status: row.status, count: num(row.count) })),
    };
  }

  async _getInventoryAnalytics(tenantId) {
    const [summary, adjustments] = await Promise.all([
      db.query(
        `SELECT
          COALESCE(SUM(stock_quantity * cost_price), 0)::numeric AS inventory_value,
          COALESCE(SUM(stock_quantity), 0)::int AS total_stock_items,
          COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold)::int AS low_stock,
          COUNT(*) FILTER (WHERE stock_quantity = 0 AND status = 'active')::int AS out_of_stock
         FROM products WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS total FROM inventory_transactions WHERE tenant_id = $1`,
        [tenantId]
      ),
    ]);
    const s = summary.rows[0];
    return {
      inventoryValue: num(s.inventory_value),
      lowStockProducts: num(s.low_stock),
      outOfStockProducts: num(s.out_of_stock),
      totalStockItems: num(s.total_stock_items),
      inventoryAdjustments: num(adjustments.rows[0].total),
    };
  }

  async _getCustomerAnalytics(tenantId) {
    const [stats, topCustomers] = await Promise.all([
      db.query(
        `SELECT
          (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1) AS total,
          (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1
             AND created_at >= date_trunc('month', NOW())) AS new_this_month,
          (SELECT COUNT(DISTINCT o.customer_id)::int FROM orders o
           WHERE o.tenant_id = $1 AND o.customer_id IS NOT NULL
             AND o.status IN ('paid', 'completed')
             AND EXISTS (
               SELECT 1 FROM orders prev
               WHERE prev.tenant_id = $1 AND prev.customer_id = o.customer_id
                 AND prev.created_at < date_trunc('month', NOW())
                 AND prev.status IN ('paid', 'completed')
             )) AS returning`,
        [tenantId]
      ),
      db.query(
        `SELECT c.id, c.name, c.email,
                COUNT(o.id)::int AS order_count,
                COALESCE(SUM(o.total_amount), 0)::numeric AS total_spent
         FROM customers c
         JOIN orders o ON o.customer_id = c.id AND o.status IN ('paid', 'completed')
         WHERE c.tenant_id = $1
         GROUP BY c.id, c.name, c.email
         ORDER BY total_spent DESC LIMIT 10`,
        [tenantId]
      ),
    ]);
    const s = stats.rows[0];
    return {
      totalCustomers: num(s.total),
      newCustomersThisMonth: num(s.new_this_month),
      returningCustomers: num(s.returning),
      topCustomers: topCustomers.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        orderCount: num(r.order_count),
        totalSpent: num(r.total_spent),
      })),
    };
  }

  async _getProductAnalytics(tenantId) {
    const [topSelling, topCategories, slowMoving] = await Promise.all([
      db.query(
        `SELECT oi.product_id, oi.product_name,
                SUM(oi.quantity)::int AS quantity_sold,
                COALESCE(SUM(oi.total), 0)::numeric AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid', 'completed')
         GROUP BY oi.product_id, oi.product_name
         ORDER BY quantity_sold DESC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT COALESCE(c.name, 'Uncategorized') AS category_name,
                SUM(oi.quantity)::int AS quantity_sold,
                COALESCE(SUM(oi.total), 0)::numeric AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid', 'completed')
         GROUP BY c.name ORDER BY revenue DESC LIMIT 10`,
        [tenantId]
      ),
      db.query(
        `SELECT p.id, p.name, p.sku, p.stock_quantity,
                COALESCE(SUM(oi.quantity), 0)::int AS quantity_sold
         FROM products p
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'completed')
           AND o.created_at >= NOW() - INTERVAL '90 days'
         WHERE p.tenant_id = $1 AND p.status = 'active'
         GROUP BY p.id, p.name, p.sku, p.stock_quantity
         HAVING COALESCE(SUM(oi.quantity), 0) <= 2
         ORDER BY quantity_sold ASC, p.stock_quantity DESC LIMIT 10`,
        [tenantId]
      ),
    ]);

    return {
      topSelling: topSelling.rows.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        quantitySold: num(r.quantity_sold),
        revenue: num(r.revenue),
      })),
      topCategories: topCategories.rows.map((r) => ({
        categoryName: r.category_name,
        quantitySold: num(r.quantity_sold),
        revenue: num(r.revenue),
      })),
      slowMoving: slowMoving.rows.map((r) => ({
        productId: r.id,
        productName: r.name,
        sku: r.sku,
        stockQuantity: num(r.stock_quantity),
        quantitySold90d: num(r.quantity_sold),
      })),
    };
  }

  async _getFinancialAnalytics(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(total_amount), 0)::numeric FROM orders
         WHERE tenant_id = $1 AND status IN ('paid', 'completed')) AS revenue,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses WHERE tenant_id = $1) AS expenses,
        (SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0)::numeric
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid', 'completed')) AS cogs`,
      [tenantId]
    );
    const r = result.rows[0];
    const revenue = num(r.revenue);
    const expenses = num(r.expenses);
    const cogs = num(r.cogs);
    const grossProfit = revenue - cogs;
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      grossProfit,
      netProfit,
      profitMarginPercent: profitMargin,
    };
  }

  async _getSubscriptionAnalytics(tenantId) {
    const [sub, features] = await Promise.all([
      db.query(
        `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug,
                p.product_limit, p.user_limit, p.storage_limit_mb, p.transaction_limit
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.tenant_id = $1
         ORDER BY s.created_at DESC LIMIT 1`,
        [tenantId]
      ),
      resolveTenantFeatures(tenantId),
    ]);

    const row = sub.rows[0];
    const daysRemaining = row?.current_period_end
      ? Math.max(0, Math.ceil((new Date(row.current_period_end) - new Date()) / 86400000))
      : null;

    const featurePacks = Object.keys(FEATURE_PACKS).map((key) => ({
      key,
      label: FEATURE_PACKS[key].label,
      enabled: Boolean(features[key]),
    }));

    return {
      planName: row?.plan_name || '—',
      planSlug: row?.plan_slug,
      startDate: row?.current_period_start,
      expiryDate: row?.current_period_end || row?.trial_ends_at,
      daysRemaining,
      paymentStatus: row?.status || 'none',
      trialEndsAt: row?.trial_ends_at,
      featurePacks,
      limits: {
        productLimit: row?.product_limit,
        userLimit: row?.user_limit,
        storageLimitMb: row?.storage_limit_mb,
        transactionLimit: row?.transaction_limit,
      },
    };
  }

  async _getUsageAnalytics(tenantId) {
    const [counts, plan, ordersMonth, transactionsMonth, imageCount] = await Promise.all([
      db.query(
        `SELECT
          (SELECT COUNT(*)::int FROM products WHERE tenant_id = $1 AND status != 'deleted') AS products,
          (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1 AND status = 'active') AS users`,
        [tenantId]
      ),
      db.query(
        `SELECT p.product_limit, p.user_limit, p.storage_limit_mb, p.transaction_limit
         FROM subscriptions s JOIN plans p ON p.id = s.plan_id
         WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
         ORDER BY s.created_at DESC LIMIT 1`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM orders
         WHERE tenant_id = $1 AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM orders
         WHERE tenant_id = $1 AND status IN ('paid', 'completed')
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM product_images pi
         JOIN products p ON p.id = pi.product_id WHERE p.tenant_id = $1`,
        [tenantId]
      ),
    ]);

    const c = counts.rows[0];
    const p = plan.rows[0] || {};
    const storageUsedMb = Math.round(num(imageCount.rows[0].c) * 0.25 * 10) / 10;

    const limitOrUnlimited = (used, limit) => ({
      used: num(used),
      limit: limit === -1 || limit == null ? null : num(limit),
      percent: limit > 0 ? Math.min(100, Math.round((num(used) / limit) * 100)) : null,
    });

    return {
      products: limitOrUnlimited(c.products, p.product_limit),
      users: limitOrUnlimited(c.users, p.user_limit),
      storage: {
        usedMb: storageUsedMb,
        limitMb: p.storage_limit_mb == null ? 1024 : num(p.storage_limit_mb),
        percent: p.storage_limit_mb > 0
          ? Math.min(100, Math.round((storageUsedMb / p.storage_limit_mb) * 100))
          : null,
      },
      ordersThisMonth: num(ordersMonth.rows[0].c),
      transactionsThisMonth: num(transactionsMonth.rows[0].c),
      transactionLimit: p.transaction_limit,
    };
  }

  async _getRecentOrders(tenantId) {
    const result = await db.query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
              COALESCE(c.name, 'Walk-in') AS customer_name
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.tenant_id = $1
       ORDER BY o.created_at DESC LIMIT 10`,
      [tenantId]
    );
    return result.rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      customerName: r.customer_name,
      amount: num(r.total_amount),
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  async _getRecentPurchaseOrders(tenantId) {
    const result = await db.query(
      `SELECT po.id, po.po_number, po.total_amount, po.status, po.created_at,
              COALESCE(s.name, '—') AS supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.tenant_id = $1
       ORDER BY po.created_at DESC LIMIT 10`,
      [tenantId]
    );
    return result.rows.map((r) => ({
      id: r.id,
      poNumber: r.po_number,
      supplierName: r.supplier_name,
      amount: num(r.total_amount),
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  async _getSystemHealth(tenantId) {
    const result = await db.query(
      `SELECT
        (SELECT MAX(last_login_at) FROM users WHERE tenant_id = $1) AS last_login,
        (SELECT MAX(created_at) FROM audit_logs WHERE tenant_id = $1) AS last_api_activity,
        (SELECT COUNT(*)::int FROM audit_logs WHERE tenant_id = $1) AS total_api_requests,
        (SELECT COUNT(*)::int FROM audit_logs
         WHERE tenant_id = $1 AND action ILIKE '%login%' AND action ILIKE '%fail%') AS failed_login_attempts`,
      [tenantId]
    );
    const r = result.rows[0];
    return {
      lastLogin: r.last_login,
      lastApiActivity: r.last_api_activity,
      totalApiRequests: num(r.total_api_requests),
      failedLoginAttempts: num(r.failed_login_attempts),
    };
  }
}

module.exports = new BusinessDashboardService();
