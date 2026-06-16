const { createRepository, createCrudService, createCrudController } = require('../../shared/crud.factory');
const db = require('../../config/database');
const { generateInvoiceNumber } = require('../../utils/helpers');

const planRepo = createRepository('plans', false);
const planService = {
  ...createCrudService(planRepo),
  async list(query = {}) {
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const status = query.status || 'active';
    const countResult = await db.query(
      'SELECT COUNT(*)::int AS total FROM plans WHERE status = $1',
      [status]
    );
    const result = await db.query(
      `SELECT * FROM plans WHERE status = $1 ORDER BY sort_order ASC, monthly_price ASC LIMIT $2`,
      [status, limit]
    );
    const total = countResult.rows[0].total;
    return {
      rows: result.rows,
      pagination: {
        total,
        page: 1,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNext: total > limit,
      },
    };
  },
};

const subscriptionRepo = createRepository('subscriptions');
const subscriptionService = {
  async list(tenantId, query) {
    return subscriptionRepo.findAll(tenantId, { page: query.page, limit: query.limit });
  },
  async getCurrent(tenantId) {
    return db.query(
      `SELECT s.*, p.name AS plan_name, p.features, p.monthly_price, p.annual_price
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = $1 ORDER BY s.created_at DESC LIMIT 1`,
      [tenantId]
    ).then((r) => r.rows[0]);
  },
  async upgrade(tenantId, planId, billingCycle = 'monthly', checkoutSessionId) {
    if (!checkoutSessionId) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('Payment required. Create a checkout session before upgrading.');
    }

    const session = await db.query(
      `SELECT * FROM payment_checkout_sessions
       WHERE id = $1 AND tenant_id = $2 AND plan_id = $3`,
      [checkoutSessionId, tenantId, planId]
    );
    if (!session.rows[0]) {
      throw new (require('../../shared/errors').NotFoundError)('Checkout session not found');
    }
    if (session.rows[0].status !== 'completed') {
      throw new (require('../../shared/errors').ValidationError)('Checkout session not paid');
    }

    return this.getCurrent(tenantId);
  },

  async activateFromPayment(tenantId, planId, billingCycle = 'monthly', client = db) {
    const plan = await planRepo.findById(planId);
    if (!plan) throw new (require('../../shared/errors').NotFoundError)('Plan not found');

    await client.query(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
       WHERE tenant_id = $1 AND status IN ('active', 'trialing')`,
      [tenantId]
    );

    const periodDays = billingCycle === 'annual' ? 365 : 30;
    const result = await client.query(
      `INSERT INTO subscriptions
         (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, payment_provider)
       VALUES ($1, $2, 'active', $3, NOW(), NOW() + ($4 || ' days')::interval, $5)
       RETURNING *`,
      [tenantId, planId, billingCycle, String(periodDays), require('../../config').payments.provider]
    );
    return result.rows[0];
  },
};

const invoiceRepo = createRepository('invoices');
const billingService = {
  async listInvoices(tenantId, query) {
    return invoiceRepo.findAll(tenantId, { page: query.page, limit: query.limit, filters: { status: query.status } });
  },
  async createInvoice(tenantId, data) {
    const total = (data.amount || 0) + (data.tax || 0) - (data.discount || 0);
    return invoiceRepo.create({
      ...data,
      invoice_number: generateInvoiceNumber(),
      total,
    }, tenantId);
  },
  async markPaid(invoiceId, tenantId, paymentData) {
    const invoice = await invoiceRepo.update(invoiceId, { status: 'paid', paid_at: new Date() }, tenantId);
    await db.query(
      `INSERT INTO subscription_payments (tenant_id, invoice_id, transaction_id, payment_method, payment_provider, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, invoiceId, paymentData.transaction_id, paymentData.payment_method, paymentData.provider, invoice.total, invoice.currency]
    );
    return invoice;
  },
};

const couponRepo = createRepository('coupons', false);
const couponService = createCrudService(couponRepo);

const notificationRepo = createRepository('notifications');
const notificationService = {
  async listForUser(tenantId, userId, query) {
    return notificationRepo.findAll(tenantId, { page: query.page, limit: query.limit });
  },
  async markRead(tenantId, id) {
    return notificationRepo.update(id, { read_at: new Date(), status: 'read' }, tenantId);
  },
  async send(tenantId, data) {
    const { addNotificationJob } = require('../../workers/queues');
    await addNotificationJob({ tenantId, ...data });
    return { queued: true };
  },
};

const ticketRepo = createRepository('tickets');
const ticketService = {
  ...createCrudService(ticketRepo),
  async create(tenantId, data) {
    const { generateTicketNumber } = require('../../utils/helpers');
    return ticketRepo.create({ ...data, ticket_number: generateTicketNumber(), user_id: data.user_id }, tenantId);
  },
};

module.exports = {
  plans: { service: planService, controller: createCrudController(planService, 'plan') },
  subscriptions: { service: subscriptionService },
  billing: { service: billingService },
  coupons: { service: couponService, controller: createCrudController(couponService, 'coupon') },
  notifications: { service: notificationService },
  tickets: { service: ticketService, controller: createCrudController(ticketService, 'ticket') },
};
