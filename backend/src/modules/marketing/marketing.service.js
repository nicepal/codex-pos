const db = require('../../config/database');
const crypto = require('crypto');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const emailService = require('../../services/email.service');

class MarketingService {
  // ── Abandoned carts ──────────────────────────────────────────────

  async syncCart(tenantId, data = {}) {
    const sessionToken = data.session_token || null;
    const email = data.email ? String(data.email).trim().toLowerCase() : null;
    if (!sessionToken && !email) {
      throw new ValidationError('session_token or email is required');
    }
    const items = Array.isArray(data.items) ? data.items : [];
    const currency = data.currency || 'USD';
    const customerId = data.customer_id || null;

    let existing = null;
    if (sessionToken) {
      const res = await db.query(
        `SELECT id FROM storefront_carts
         WHERE tenant_id = $1 AND session_token = $2 AND recovered_at IS NULL AND converted_order_id IS NULL
         ORDER BY last_activity_at DESC LIMIT 1`,
        [tenantId, sessionToken]
      );
      existing = res.rows[0];
    }
    if (!existing && email) {
      const res = await db.query(
        `SELECT id FROM storefront_carts
         WHERE tenant_id = $1 AND email = $2 AND recovered_at IS NULL AND converted_order_id IS NULL
         ORDER BY last_activity_at DESC LIMIT 1`,
        [tenantId, email]
      );
      existing = res.rows[0];
    }

    if (existing) {
      const updated = await db.query(
        `UPDATE storefront_carts
         SET items = $3::jsonb, email = COALESCE($4, email), customer_id = COALESCE($5, customer_id),
             currency = $6, session_token = COALESCE($7, session_token),
             last_activity_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [existing.id, tenantId, JSON.stringify(items), email, customerId, currency, sessionToken]
      );
      return updated.rows[0];
    }

    const inserted = await db.query(
      `INSERT INTO storefront_carts
         (tenant_id, customer_id, session_token, email, items, currency, last_activity_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW()) RETURNING *`,
      [tenantId, customerId, sessionToken, email, JSON.stringify(items), currency]
    );
    return inserted.rows[0];
  }

  async listAbandonedCarts(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const hours = parseInt(query.hours, 10) || 1;

    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM storefront_carts
       WHERE tenant_id = $1 AND recovered_at IS NULL AND converted_order_id IS NULL
         AND jsonb_array_length(items) > 0
         AND last_activity_at < NOW() - ($2 || ' hours')::interval`,
      [tenantId, String(hours)]
    );
    const rows = await db.query(
      `SELECT * FROM storefront_carts
       WHERE tenant_id = $1 AND recovered_at IS NULL AND converted_order_id IS NULL
         AND jsonb_array_length(items) > 0
         AND last_activity_at < NOW() - ($2 || ' hours')::interval
       ORDER BY last_activity_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, String(hours), limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async recoverCart(tenantId, cartId) {
    const cartRes = await db.query(
      `SELECT * FROM storefront_carts WHERE id = $1 AND tenant_id = $2`,
      [cartId, tenantId]
    );
    const cart = cartRes.rows[0];
    if (!cart) throw new NotFoundError('Cart not found');
    if (!cart.email) throw new ValidationError('Cart has no email for recovery');

    const job = await db.query(
      `INSERT INTO cart_recovery_jobs (tenant_id, cart_id, status, scheduled_at)
       VALUES ($1, $2, 'pending', NOW()) RETURNING *`,
      [tenantId, cartId]
    );

    try {
      await emailService.send({
        to: cart.email,
        subject: 'You left items in your cart',
        html: `<p>You still have items waiting in your cart. Come back and complete your purchase!</p>`,
        text: 'You still have items waiting in your cart. Come back and complete your purchase!',
        tenantId,
        type: 'cart_recovery',
      });
      await db.query(
        `UPDATE cart_recovery_jobs SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [job.rows[0].id]
      );
      await db.query(
        `UPDATE storefront_carts
         SET recovery_emails_sent = recovery_emails_sent + 1, recovered_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [cartId, tenantId]
      );
    } catch (err) {
      await db.query(
        `UPDATE cart_recovery_jobs SET status = 'failed', error_message = $2 WHERE id = $1`,
        [job.rows[0].id, err.message]
      );
      throw err;
    }

    return { cart_id: cartId, job_id: job.rows[0].id, status: 'sent' };
  }

  // ── Campaigns ────────────────────────────────────────────────────

  async listCampaigns(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM campaigns WHERE tenant_id = $1`,
      [tenantId]
    );
    const rows = await db.query(
      `SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async createCampaign(tenantId, data, userId) {
    if (!data.name) throw new ValidationError('name is required');
    const result = await db.query(
      `INSERT INTO campaigns
         (tenant_id, name, channel, subject, body, segment_id, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        tenantId,
        data.name,
        data.channel || 'email',
        data.subject || null,
        data.body || null,
        data.segment_id || null,
        data.status || 'draft',
        data.scheduled_at || null,
        userId || null,
      ]
    );
    return result.rows[0];
  }

  async getCampaign(tenantId, id) {
    const result = await db.query(
      `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Campaign not found');
    const sends = await db.query(
      `SELECT status, COUNT(*)::int AS count FROM campaign_sends
       WHERE campaign_id = $1 GROUP BY status`,
      [id]
    );
    return { ...result.rows[0], send_stats: sends.rows };
  }

  async sendCampaign(tenantId, id) {
    const campaign = await this.getCampaign(tenantId, id);
    if (campaign.status === 'sent') throw new ValidationError('Campaign already sent');

    const recipients = await this._resolveCampaignRecipients(tenantId, campaign.segment_id);
    let queued = 0;
    for (const r of recipients) {
      if (!r.email && !r.phone) continue;
      await db.query(
        `INSERT INTO campaign_sends (tenant_id, campaign_id, recipient, customer_id, status)
         VALUES ($1, $2, $3, $4, 'queued')`,
        [tenantId, id, r.email || r.phone, r.id || null]
      );
      queued += 1;

      if (campaign.channel === 'sms' && r.phone) {
        try {
          const smsService = require('../../services/sms.service');
          await smsService.sendSms(r.phone, campaign.body || campaign.subject || '');
          await db.query(
            `UPDATE campaign_sends SET status = 'sent', sent_at = NOW()
             WHERE campaign_id = $1 AND recipient = $2 AND status = 'queued'`,
            [id, r.phone]
          );
        } catch (_) { /* leave queued for retry */ }
      } else if (r.email) {
        emailService.send({
          to: r.email,
          subject: campaign.subject || campaign.name,
          html: campaign.body || `<p>${campaign.name}</p>`,
          tenantId,
          type: 'campaign',
        }).catch(() => {});
      }
    }

    const updated = await db.query(
      `UPDATE campaigns
       SET status = 'sent', sent_at = NOW(), updated_at = NOW(),
           stats = jsonb_build_object('queued', $3::int)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, queued]
    );
    return { campaign: updated.rows[0], queued };
  }

  async _resolveCampaignRecipients(tenantId, segmentId) {
    if (segmentId) {
      const seg = await db.query(
        `SELECT * FROM customer_segments WHERE id = $1 AND tenant_id = $2`,
        [segmentId, tenantId]
      );
      if (seg.rows[0]) {
        return this.resolveSegmentMembers(tenantId, seg.rows[0]);
      }
    }
    const all = await db.query(
      `SELECT id, email, phone, name FROM customers
       WHERE tenant_id = $1 AND status = 'active' AND email IS NOT NULL`,
      [tenantId]
    );
    return all.rows;
  }

  // ── Segments ─────────────────────────────────────────────────────

  async listSegments(tenantId) {
    const result = await db.query(
      `SELECT * FROM customer_segments WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  async createSegment(tenantId, data) {
    if (!data.name || !data.filter_type) {
      throw new ValidationError('name and filter_type are required');
    }
    const result = await db.query(
      `INSERT INTO customer_segments (tenant_id, name, description, filter_type, filter_config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, data.name, data.description || null, data.filter_type, JSON.stringify(data.filter_config || {})]
    );
    return result.rows[0];
  }

  async updateSegment(tenantId, id, data) {
    const existing = await db.query(
      `SELECT * FROM customer_segments WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundError('Segment not found');
    const result = await db.query(
      `UPDATE customer_segments
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           filter_type = COALESCE($5, filter_type),
           filter_config = COALESCE($6::jsonb, filter_config)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id,
        tenantId,
        data.name || null,
        data.description !== undefined ? data.description : null,
        data.filter_type || null,
        data.filter_config ? JSON.stringify(data.filter_config) : null,
      ]
    );
    return result.rows[0];
  }

  async resolveSegmentMembers(tenantId, segment) {
    const type = (segment.filter_type || 'all').toLowerCase();
    if (type === 'high_value') {
      const result = await db.query(
        `SELECT c.id, c.email, c.phone, c.name,
                COALESCE(SUM(o.total_amount), 0)::numeric AS lifetime_value
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
           AND o.status IN ('paid', 'completed')
         WHERE c.tenant_id = $1 AND c.status = 'active'
         GROUP BY c.id
         HAVING COALESCE(SUM(o.total_amount), 0) >= COALESCE(($2::jsonb->>'min_spend')::numeric, 500)
         ORDER BY lifetime_value DESC`,
        [tenantId, JSON.stringify(segment.filter_config || {})]
      );
      return result.rows;
    }
    if (type === 'inactive') {
      const days = Number(segment.filter_config?.inactive_days) || 90;
      const result = await db.query(
        `SELECT c.id, c.email, c.phone, c.name
         FROM customers c
         WHERE c.tenant_id = $1 AND c.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM orders o
             WHERE o.customer_id = c.id AND o.tenant_id = c.tenant_id
               AND o.status IN ('paid', 'completed')
               AND o.created_at >= NOW() - ($2 || ' days')::interval
           )`,
        [tenantId, String(days)]
      );
      return result.rows;
    }
    // default: all
    const result = await db.query(
      `SELECT id, email, phone, name FROM customers WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );
    return result.rows;
  }

  // ── Loyalty tiers ────────────────────────────────────────────────

  async listLoyaltyTiers(tenantId) {
    const result = await db.query(
      `SELECT * FROM loyalty_tiers WHERE tenant_id = $1 ORDER BY sort_order, min_points`,
      [tenantId]
    );
    return result.rows;
  }

  async createLoyaltyTier(tenantId, data) {
    if (!data.name) throw new ValidationError('name is required');
    const result = await db.query(
      `INSERT INTO loyalty_tiers (tenant_id, name, min_points, multiplier, benefits, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        tenantId,
        data.name,
        parseInt(data.min_points, 10) || 0,
        data.multiplier != null ? Number(data.multiplier) : 1,
        JSON.stringify(data.benefits || {}),
        parseInt(data.sort_order, 10) || 0,
      ]
    );
    return result.rows[0];
  }

  async updateLoyaltyTier(tenantId, id, data) {
    const existing = await db.query(
      `SELECT id FROM loyalty_tiers WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundError('Loyalty tier not found');
    const result = await db.query(
      `UPDATE loyalty_tiers
       SET name = COALESCE($3, name),
           min_points = COALESCE($4, min_points),
           multiplier = COALESCE($5, multiplier),
           benefits = COALESCE($6::jsonb, benefits),
           sort_order = COALESCE($7, sort_order)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id,
        tenantId,
        data.name || null,
        data.min_points != null ? parseInt(data.min_points, 10) : null,
        data.multiplier != null ? Number(data.multiplier) : null,
        data.benefits ? JSON.stringify(data.benefits) : null,
        data.sort_order != null ? parseInt(data.sort_order, 10) : null,
      ]
    );
    return result.rows[0];
  }

  async assignLoyaltyTier(tenantId, customerId) {
    const customer = await db.query(
      `SELECT id, loyalty_points FROM customers WHERE id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );
    if (!customer.rows[0]) throw new NotFoundError('Customer not found');
    const points = parseInt(customer.rows[0].loyalty_points, 10) || 0;
    const tier = await db.query(
      `SELECT * FROM loyalty_tiers
       WHERE tenant_id = $1 AND min_points <= $2
       ORDER BY min_points DESC LIMIT 1`,
      [tenantId, points]
    );
    const tierId = tier.rows[0]?.id || null;
    const updated = await db.query(
      `UPDATE customers SET loyalty_tier_id = $3 WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [customerId, tenantId, tierId]
    );
    return { customer: updated.rows[0], tier: tier.rows[0] || null };
  }

  // ── Referrals ────────────────────────────────────────────────────

  async createReferral(tenantId, customerId, rewardPoints = 100) {
    if (!customerId) throw new ValidationError('customer_id is required');
    const customer = await db.query(
      `SELECT id, referral_code FROM customers WHERE id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );
    if (!customer.rows[0]) throw new NotFoundError('Customer not found');

    let code = customer.rows[0].referral_code;
    if (!code) {
      code = `C${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await db.query(
        `UPDATE customers SET referral_code = $3 WHERE id = $1 AND tenant_id = $2`,
        [customerId, tenantId, code]
      );
    }

    const existing = await db.query(
      `SELECT * FROM referrals WHERE tenant_id = $1 AND code = $2`,
      [tenantId, code]
    );
    if (existing.rows[0]) return existing.rows[0];

    const result = await db.query(
      `INSERT INTO referrals (tenant_id, referrer_customer_id, code, reward_points, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [tenantId, customerId, code, parseInt(rewardPoints, 10) || 100]
    );
    return result.rows[0];
  }

  async redeemReferral(tenantId, code, refereeCustomerId) {
    if (!code || !refereeCustomerId) {
      throw new ValidationError('code and referee_customer_id are required');
    }
    const referral = await db.query(
      `SELECT * FROM referrals WHERE tenant_id = $1 AND UPPER(code) = UPPER($2)`,
      [tenantId, code]
    );
    if (!referral.rows[0]) throw new NotFoundError('Referral code not found');
    const row = referral.rows[0];
    if (row.status !== 'active') throw new ValidationError('Referral code is no longer active');
    if (row.referrer_customer_id === refereeCustomerId) {
      throw new ValidationError('Cannot redeem your own referral code');
    }

    const updated = await db.query(
      `UPDATE referrals
       SET referee_customer_id = $3, status = 'redeemed', redeemed_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [row.id, tenantId, refereeCustomerId]
    );

    if (row.reward_points > 0) {
      await db.query(
        `UPDATE customers SET loyalty_points = COALESCE(loyalty_points, 0) + $3
         WHERE id = $1 AND tenant_id = $2`,
        [row.referrer_customer_id, tenantId, row.reward_points]
      );
      await this.assignLoyaltyTier(tenantId, row.referrer_customer_id).catch(() => {});
    }

    return updated.rows[0];
  }

  // ── Affiliates ───────────────────────────────────────────────────

  async trackAffiliateClick(tenantId, data = {}, meta = {}) {
    const code = String(data.code || data.referral_code || '').trim();
    if (!code) throw new ValidationError('referral code is required');

    const affiliate = await db.query(
      `SELECT * FROM affiliates WHERE UPPER(referral_code) = UPPER($1) AND status = 'active'`,
      [code]
    );
    if (!affiliate.rows[0]) throw new NotFoundError('Affiliate not found');

    const result = await db.query(
      `INSERT INTO affiliate_clicks (tenant_id, affiliate_id, referral_code, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, affiliate.rows[0].id, affiliate.rows[0].referral_code, meta.ip || null, meta.userAgent || null]
    );
    return result.rows[0];
  }

  async attributeOrder(tenantId, orderId, code) {
    if (!orderId || !code) return null;
    const affiliate = await db.query(
      `SELECT * FROM affiliates WHERE UPPER(referral_code) = UPPER($1) AND status = 'active'`,
      [code]
    );
    if (!affiliate.rows[0]) return null;
    const result = await db.query(
      `UPDATE orders
       SET affiliate_id = $3, referral_code = $4
       WHERE id = $1 AND tenant_id = $2 RETURNING id, affiliate_id, referral_code`,
      [orderId, tenantId, affiliate.rows[0].id, affiliate.rows[0].referral_code]
    );
    return result.rows[0] || null;
  }
}

module.exports = new MarketingService();
