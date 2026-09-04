const db = require('../../config/database');
const { generateOrderNumber } = require('../../utils/helpers');
const orderService = require('../orders/orders.service');
const loyaltyService = require('../loyalty/loyalty.service');
const { toStorefrontMediaUrl } = require('../../services/upload.service');

class StorefrontCheckoutService {
  async checkout(tenantId, data) {
    let customerId = data.customer_id || null;
    if (!customerId && data.customer_email) {
      const row = await db.query(
        `SELECT id FROM customers WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
        [tenantId, String(data.customer_email).trim()]
      );
      customerId = row.rows[0]?.id || null;
    }

    const ship = data.shipping_address || {};
    const addressLines = [
      ship.line1,
      ship.line2,
      [ship.city, ship.postal_code].filter(Boolean).join(' '),
      ship.country,
    ].filter(Boolean);

    const customerNote = [
      data.customer_name && `Name: ${data.customer_name}`,
      data.customer_email && `Email: ${data.customer_email}`,
      data.customer_phone && `Phone: ${data.customer_phone}`,
      addressLines.length ? `Ship to: ${addressLines.join(', ')}` : null,
    ].filter(Boolean).join(' | ');

    const notes = [data.notes, customerNote].filter(Boolean).join('\n');

    const payload = {
      items: data.items,
      payment_method: data.payment_method,
      notes: notes || null,
      order_type: 'online',
      status: data.payment_method || data.gift_card_code || data.payments ? 'paid' : 'pending',
      fulfillment_type: data.fulfillment_type,
      pickup_branch_id: data.pickup_branch_id,
      customer_id: customerId,
      coupon_code: data.coupon_code || null,
      gift_card_code: data.gift_card_code || null,
      loyalty_points_to_redeem: data.loyalty_points_to_redeem || null,
      discount_amount: data.discount_amount,
      tip_amount: data.tip_amount,
      payments: data.payments || null,
    };

    const order = await orderService.createPOSOrder(tenantId, payload, null);

    if (data.customer_id && order.status === 'paid') {
      await loyaltyService.earnPoints(tenantId, data.customer_id, order.id, order.total_amount);
    }

    if (data.referral_code || data.affiliate_code) {
      try {
        const marketingService = require('../marketing/marketing.service');
        await marketingService.attributeOrder(
          tenantId,
          order.id,
          data.referral_code || data.affiliate_code
        );
      } catch (_) { /* optional attribution */ }
    }

    return {
      ...order,
      customer_name: data.customer_name || null,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      shipping_address: addressLines.length ? {
        line1: ship.line1 || null,
        line2: ship.line2 || null,
        city: ship.city || null,
        postal_code: ship.postal_code || null,
        country: ship.country || null,
        formatted: addressLines.join(', '),
      } : null,
      fulfillment_type: data.fulfillment_type || null,
    };
  }

  async loyaltyPreview(tenantId, email) {
    if (!email) return { points: 0, redeem_rate: 0.01 };
    const row = await db.query(
      `SELECT loyalty_points FROM customers WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [tenantId, String(email).trim()]
    );
    const settings = await loyaltyService.getSettings(tenantId);
    return {
      points: row.rows[0]?.loyalty_points || 0,
      redeem_rate: settings.redeem_rate || 0.01,
    };
  }

  async getTheme(tenantId) {
    const settings = await db.query(`SELECT key, value FROM settings WHERE tenant_id = $1 AND key LIKE 'storefront_%'`, [tenantId]);
    const tenant = await db.query('SELECT name, logo_url, currency FROM tenants WHERE id = $1', [tenantId]);
    const row = tenant.rows[0] || {};
    return {
      ...row,
      logo_url: toStorefrontMediaUrl(row.logo_url),
      theme: Object.fromEntries(settings.rows.map((r) => [r.key.replace('storefront_', ''), r.value])),
    };
  }

  async updateTheme(tenantId, theme) {
    for (const [key, value] of Object.entries(theme)) {
      await db.query(
        `INSERT INTO settings (tenant_id, key, value) VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value`,
        [tenantId, `storefront_${key}`, JSON.stringify(value)]
      );
    }
    return this.getTheme(tenantId);
  }

  async getSitemap(tenantId) {
    const tenant = await db.query('SELECT slug FROM tenants WHERE id = $1', [tenantId]);
    const products = await db.query(`SELECT slug, updated_at FROM products WHERE tenant_id = $1 AND status = 'active'`, [tenantId]);
    const categories = await db.query(`SELECT slug, updated_at FROM categories WHERE tenant_id = $1 AND status = 'active'`, [tenantId]);
    const base = `https://${tenant.rows[0]?.slug}.poshive.store`;
    return {
      urls: [
        { loc: base, changefreq: 'daily' },
        { loc: `${base}/shop`, changefreq: 'daily' },
        ...categories.rows.map((c) => ({ loc: `${base}/shop?category=${c.slug}`, lastmod: c.updated_at })),
        ...products.rows.map((p) => ({ loc: `${base}/product/${p.slug}`, lastmod: p.updated_at })),
      ],
    };
  }
}

module.exports = new StorefrontCheckoutService();
