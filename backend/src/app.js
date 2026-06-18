const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { tenantResolver } = require('./middleware/tenant');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./modules/auth/auth.routes');
const businessRoutes = require('./modules/businesses/businesses.routes');
const productRoutes = require('./modules/products/products.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const storefrontRoutes = require('./modules/storefront/storefront.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const mediaRoutes = require('./modules/media/media.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const categoryRoutes = require('./modules/categories/categories.routes');
const customerRoutes = require('./modules/customers/customers.routes');
const affiliateRoutes = require('./modules/affiliates/affiliates.routes');
const branchRoutes = require('./modules/branches/branches.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const ticketRoutes = require('./modules/tickets/tickets.routes');
const brandRoutes = require('./modules/brands/brands.routes');
const purchaseOrderRoutes = require('./modules/purchase-orders/purchase-orders.routes');
const teamRoutes = require('./modules/team/team.routes');
const cmsRoutes = require('./modules/cms/cms.routes');
const couponRoutes = require('./modules/coupons/coupons.routes');
const transferRoutes = require('./modules/transfers/transfers.routes');
const webhookRoutes = require('./modules/webhooks/webhooks.routes');
const drawerRoutes = require('./modules/drawer/drawer.routes');
const taxRulesRoutes = require('./modules/tax-rules/tax-rules.routes');
const activityRoutes = require('./modules/activity/activity.routes');
const domainRoutes = require('./modules/domains/domains.routes');
const expenseRoutes = require('./modules/expenses/expenses.routes');
const giftCardRoutes = require('./modules/gift-cards/gift-cards.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const apiKeyRoutes = require('./modules/api-keys/api-keys.routes');
const publicApiRoutes = require('./modules/public-api/public-api.routes');
const reviewRoutes = require('./modules/reviews/reviews.routes');
const marketplaceRoutes = require('./modules/marketplace/marketplace.routes');
const complianceRoutes = require('./modules/compliance/compliance.routes');
const shopifyRoutes = require('./modules/integrations/shopify/shopify.routes');
const adminEmailRoutes = require('./modules/platform/email/email.routes');
const crudModules = require('./modules/_crud');
const employeeRoutes = require('./modules/employees/employees.routes');
const platform = require('./modules/platform/platform.services');
const { authenticate, authorize, requireTenantAccess, requirePlatformAdmin } = require('./middleware/auth');
const { requireTenant } = require('./middleware/tenant');
const { asyncHandler } = require('./middleware/errorHandler');
const { success, paginated } = require('./shared/response');

const { attachTenantFeatures } = require('./middleware/features');
const { auditLog } = require('./middleware/audit');

function createCrudRouter(moduleName) {
  const mod = crudModules[moduleName];
  const router = express.Router();
  router.use(authenticate, requireTenant, requireTenantAccess, authorize(mod.permission));
  router.get('/', mod.controller.list);
  router.post('/bulk-delete', auditLog(`${moduleName}.delete`, moduleName), mod.controller.bulkRemove);
  router.get('/:id', mod.controller.getById);
  router.post('/', auditLog(`${moduleName}.create`, moduleName), mod.controller.create);
  router.put('/:id', auditLog(`${moduleName}.update`, moduleName), mod.controller.update);
  router.delete('/:id', auditLog(`${moduleName}.delete`, moduleName), mod.controller.remove);
  return router;
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // Global abuse protection across the whole API surface
  app.use(rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use(tenantResolver);

  const api = express.Router();
  api.use(attachTenantFeatures);

  // Stricter limiter for credential endpoints (brute-force protection)
  const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  });

  // Dedicated limiter for the public developer API (per IP)
  const publicApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.PUBLIC_API_RATE_LIMIT_MAX, 10) || 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'API rate limit exceeded.' },
  });

  api.get('/health', (req, res) => {
    res.json({ success: true, message: 'Codex POS API is running', version: '1.0.0' });
  });

  api.use('/auth', authLimiter, authRoutes);
  api.use('/businesses', businessRoutes);
  api.use('/products', productRoutes);
  api.use('/categories', categoryRoutes);
  api.use('/inventory', inventoryRoutes);
  api.use('/customers', customerRoutes);
  api.use('/suppliers', createCrudRouter('suppliers'));
  api.use('/orders', orderRoutes);
  api.use('/employees', employeeRoutes);
  api.use('/expenses', expenseRoutes);
  api.use('/reports', reportRoutes);
  api.use('/storefront', storefrontRoutes);
  api.use('/settings', settingsRoutes);
  api.use('/upload', uploadRoutes);
  api.use('/media', mediaRoutes);
  api.use('/uploads', mediaRoutes);
  api.use('/payments', paymentsRoutes);
  api.use('/branches', branchRoutes);
  api.use('/billing', billingRoutes);
  api.use('/audit-logs', auditRoutes);
  api.use('/affiliates', affiliateRoutes);
  api.use('/tickets', ticketRoutes);
  api.use('/brands', brandRoutes);
  api.use('/purchase-orders', purchaseOrderRoutes);
  api.use('/team', teamRoutes);
  api.use('/cms', cmsRoutes);
  api.use('/tenant-coupons', couponRoutes);
  api.use('/transfers', transferRoutes);
  api.use('/webhooks', webhookRoutes);
  api.use('/drawer', drawerRoutes);
  api.use('/tax-rules', taxRulesRoutes);
  api.use('/activity', activityRoutes);
  api.use('/domains', domainRoutes);
  api.use('/gift-cards', giftCardRoutes);
  api.use('/ai', aiRoutes);
  api.use('/api-keys', apiKeyRoutes);
  api.use('/public/v1', publicApiLimiter, publicApiRoutes);
  api.use('/reviews', reviewRoutes);
  api.use('/marketplace', marketplaceRoutes);
  api.use('/compliance', complianceRoutes);
  api.use('/integrations/shopify', shopifyRoutes);
  api.use('/admin/email', adminEmailRoutes);

  api.get('/usage', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const { getUsageSummary } = require('./shared/plan-limits');
    return success(res, await getUsageSummary(req.tenant.id));
  }));

  api.get('/plans', asyncHandler(async (req, res) => {
    const result = await platform.plans.service.list(req.query);
    return paginated(res, result.rows, result.pagination);
  }));

  const plansAdmin = express.Router();
  plansAdmin.use(authenticate, requirePlatformAdmin);
  plansAdmin.post('/', platform.plans.controller.create);
  plansAdmin.put('/:id', platform.plans.controller.update);
  plansAdmin.delete('/:id', platform.plans.controller.remove);
  api.use('/plans', plansAdmin);

  api.get('/subscriptions/current', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const sub = await platform.subscriptions.service.getCurrent(req.tenant.id);
    return success(res, sub);
  }));

  api.post('/subscriptions/upgrade', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const sub = await platform.subscriptions.service.upgrade(
      req.tenant.id,
      req.body.plan_id,
      req.body.billing_cycle,
      req.body.checkout_session_id
    );
    return success(res, sub, 'Subscription upgraded');
  }));

  api.post('/subscriptions/checkout', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const paymentsService = require('./modules/payments/payments.service');
    const session = await paymentsService.createCheckoutSession(
      req.tenant.id,
      req.body.plan_id,
      req.body.billing_cycle
    );
    return success(res, session, 'Checkout session created');
  }));

  api.post('/subscriptions/confirm', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const paymentsService = require('./modules/payments/payments.service');
    const reference = req.body.payment_reference || `sim_${Date.now()}`;
    const result = await paymentsService.completeCheckoutSession(req.body.session_id, reference);
    return success(res, result, 'Payment confirmed');
  }));

  api.get('/invoices', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const result = await platform.billing.service.listInvoices(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }));

  api.get('/coupons', authenticate, requirePlatformAdmin, platform.coupons.controller.list);
  api.post('/coupons', authenticate, requirePlatformAdmin, platform.coupons.controller.create);

  api.get('/notifications', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const result = await platform.notifications.service.listForUser(req.tenant?.id, req.user.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }));

  api.patch('/notifications/:id/read', authenticate, requireTenant, requireTenantAccess, asyncHandler(async (req, res) => {
    const result = await platform.notifications.service.markRead(req.tenant.id, req.params.id);
    return success(res, result);
  }));

  api.post('/notifications/send', authenticate, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const result = await platform.notifications.service.send(req.body.tenant_id, req.body);
    return success(res, result);
  }));

  api.get('/admin/subscriptions/overview', authenticate, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const db = require('./config/database');
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'active') AS active_subscriptions,
        (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'trialing') AS trialing,
        (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'cancelled') AS cancelled,
        (SELECT COALESCE(SUM(p.monthly_price), 0)::numeric FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active' AND s.billing_cycle = 'monthly') AS mrr,
        (SELECT COUNT(*)::int FROM tenants WHERE trial_ends_at < NOW() + INTERVAL '7 days' AND status = 'trial') AS trials_expiring
    `);
    return success(res, stats.rows[0]);
  }));

  api.get('/audit-logs/impersonation', authenticate, requirePlatformAdmin, asyncHandler(async (req, res) => {
    const db = require('./config/database');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const count = await db.query('SELECT COUNT(*)::int AS total FROM impersonation_logs');
    const rows = await db.query(
      `SELECT il.*, u.email AS admin_email, t.name AS tenant_name
       FROM impersonation_logs il
       LEFT JOIN users u ON u.id = il.admin_user_id
       LEFT JOIN tenants t ON t.id = il.target_tenant_id
       ORDER BY il.started_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = count.rows[0].total;
    return paginated(res, rows.rows, { total, page, limit, totalPages: Math.ceil(total / limit) });
  }));

  app.use(config.apiPrefix, api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
