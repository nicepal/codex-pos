const businessRepo = require('./businesses.repository');
const db = require('../../config/database');
const config = require('../../config');
const { hashPassword } = require('../../utils/password');
const { slugify, paginate, paginationMeta } = require('../../utils/helpers');
const { NotFoundError, ConflictError } = require('../../shared/errors');

class BusinessService {
  async list(query) {
    const { page, limit } = paginate(query.page, query.limit);
    const { rows, total } = await businessRepo.findAllWithDetails({
      page, limit, status: query.status, search: query.search,
    });
    return { businesses: rows, pagination: paginationMeta(total, page, limit) };
  }

  async create(data) {
    const {
      businessName,
      slug,
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      timezone,
      currency,
      plan_id: planId,
      trial_days: trialDays = 14,
      status = 'trial',
    } = data;

    const businessSlug = slug || slugify(businessName);
    const trialDaysNum = Math.max(0, parseInt(trialDays, 10) || 14);
    const tenantStatus = status === 'active' ? 'active' : 'trial';

    const existingSlug = await db.query('SELECT id FROM tenants WHERE slug = $1', [businessSlug]);
    if (existingSlug.rows.length) throw new ConflictError('Business slug already taken');

    const existingEmail = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingEmail.rows.length) throw new ConflictError('Email already registered');

    let resolvedPlanId = planId;
    if (!resolvedPlanId) {
      const starter = await db.query(`SELECT id FROM plans WHERE slug = 'starter' LIMIT 1`);
      resolvedPlanId = starter.rows[0]?.id;
    } else {
      const plan = await db.query('SELECT id FROM plans WHERE id = $1', [resolvedPlanId]);
      if (!plan.rows[0]) throw new NotFoundError('Plan not found');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const trialEnds = tenantStatus === 'trial'
        ? new Date(Date.now() + trialDaysNum * 86400000)
        : null;

      const tenantResult = await client.query(
        `INSERT INTO tenants (name, slug, email, phone, address, timezone, currency, status, trial_ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          businessName,
          businessSlug,
          email,
          phone || null,
          address || null,
          timezone || 'UTC',
          (currency || 'USD').toUpperCase(),
          tenantStatus,
          trialEnds,
        ]
      );
      const tenant = tenantResult.rows[0];

      await client.query(
        `INSERT INTO tenant_domains (tenant_id, domain, domain_type, is_primary, verification_status)
         VALUES ($1, $2, 'subdomain', true, 'verified')`,
        [tenant.id, `${businessSlug}.${config.app.platformDomain}`]
      );

      if (resolvedPlanId) {
        const subStatus = tenantStatus === 'trial' ? 'trialing' : 'active';
        await client.query(
          `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end)
           VALUES ($1, $2, $3, 'monthly', $4, NOW(), NOW() + INTERVAL '1 month')`,
          [tenant.id, resolvedPlanId, subStatus, trialEnds]
        );
      }

      const passwordHash = await hashPassword(password);
      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id, email, first_name, last_name, phone, status`,
        [tenant.id, email.toLowerCase(), passwordHash, firstName, lastName, phone || null]
      );
      const user = userResult.rows[0];

      const ownerRole = await client.query(`SELECT id FROM roles WHERE name = 'business_owner'`);
      if (ownerRole.rows[0]) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)`,
          [user.id, ownerRole.rows[0].id, tenant.id]
        );
      }

      await client.query('COMMIT');

      setImmediate(() => {
        const emailService = require('../../services/email.service');
        emailService.sendWelcomeEmail(user, tenant).catch(() => {});
      });

      return this.getById(tenant.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id) {
    const business = await businessRepo.findById(id);
    if (!business) throw new NotFoundError('Business not found');

    const domains = await db.query('SELECT * FROM tenant_domains WHERE tenant_id = $1', [id]);
    const subscription = await db.query(
      `SELECT s.*, p.name AS plan_name FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id WHERE s.tenant_id = $1 ORDER BY s.created_at DESC LIMIT 1`,
      [id]
    );
    const owner = await db.query(
      `SELECT u.email AS owner_email,
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS owner_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id AND r.name = 'business_owner'
       WHERE u.tenant_id = $1
       LIMIT 1`,
      [id]
    );

    return {
      ...business,
      ...owner.rows[0],
      domains: domains.rows,
      subscription: subscription.rows[0],
    };
  }

  async update(id, data) {
    return businessRepo.update(id, data);
  }

  async suspend(id) {
    return businessRepo.update(id, { status: 'suspended' });
  }

  async activate(id) {
    return businessRepo.update(id, { status: 'active' });
  }

  async delete(id) {
    return businessRepo.update(id, { status: 'deleted' });
  }

  async extendTrial(id, days) {
    const business = await businessRepo.findById(id);
    if (!business) throw new NotFoundError('Business not found');
    const trialEnds = new Date(Date.now() + days * 86400000);
    await businessRepo.update(id, { status: 'trial', trial_ends_at: trialEnds });
    await db.query(
      `UPDATE subscriptions SET trial_ends_at = $1, status = 'trialing' WHERE tenant_id = $2`,
      [trialEnds, id]
    );
    return { trial_ends_at: trialEnds };
  }

  async getDashboardStats() {
    return businessRepo.getPlatformStats();
  }

  async getGrowthCharts(months = 12) {
    return businessRepo.getGrowthData(months);
  }

  async upgradePlan(tenantId, planId, billingCycle = 'monthly') {
    const plan = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!plan.rows[0]) throw new NotFoundError('Plan not found');

    await db.query(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
       WHERE tenant_id = $1 AND status IN ('active', 'trialing')`,
      [tenantId]
    );

    const sub = await db.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, NOW(), NOW() + INTERVAL '1 month' * CASE WHEN $3 = 'annual' THEN 12 ELSE 1 END)
       RETURNING *`,
      [tenantId, planId, billingCycle]
    );

    await db.query(`UPDATE tenants SET status = 'active' WHERE id = $1`, [tenantId]);
    return sub.rows[0];
  }

  async getInvoices(tenantId, query) {
    const offset = ((parseInt(query.page, 10) || 1) - 1) * (parseInt(query.limit, 10) || 20);
    const limit = parseInt(query.limit, 10) || 20;
    const conditions = tenantId ? ['i.tenant_id = $1'] : ['1=1'];
    const params = tenantId ? [tenantId] : [];
    let idx = params.length + 1;

    if (query.status) {
      conditions.push(`i.status = $${idx++}`);
      params.push(query.status);
    }

    const where = conditions.join(' AND ');
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM invoices i WHERE ${where}`, params);
    const result = await db.query(
      `SELECT i.*, t.name AS tenant_name, p.name AS plan_name
       FROM invoices i
       LEFT JOIN tenants t ON t.id = i.tenant_id
       LEFT JOIN plans p ON p.id = i.plan_id
       WHERE ${where} ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return { rows: result.rows, pagination: paginationMeta(count.rows[0].total, parseInt(query.page, 10) || 1, limit) };
  }
}

module.exports = new BusinessService();
