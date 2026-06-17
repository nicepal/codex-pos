const db = require('../../config/database');
const { generateOrderNumber } = require('../../utils/helpers');
const orderService = require('../orders/orders.service');
const loyaltyService = require('../loyalty/loyalty.service');

class StorefrontCheckoutService {
  async checkout(tenantId, data) {
    const customerNote = [
      data.customer_name && `Name: ${data.customer_name}`,
      data.customer_email && `Email: ${data.customer_email}`,
      data.customer_phone && `Phone: ${data.customer_phone}`,
    ].filter(Boolean).join(' | ');

    const order = await orderService.createPOSOrder(tenantId, {
      items: data.items,
      payment_method: data.payment_method,
      notes: data.notes || customerNote || null,
      order_type: 'online',
      status: data.payment_method ? 'paid' : 'pending',
      fulfillment_type: data.fulfillment_type,
      pickup_branch_id: data.pickup_branch_id,
    }, null);

    if (data.customer_id && order.status === 'paid') {
      await loyaltyService.earnPoints(tenantId, data.customer_id, order.id, order.total_amount);
    }

    return order;
  }

  async getTheme(tenantId) {
    const settings = await db.query(`SELECT key, value FROM settings WHERE tenant_id = $1 AND key LIKE 'storefront_%'`, [tenantId]);
    const tenant = await db.query('SELECT name, logo_url, currency FROM tenants WHERE id = $1', [tenantId]);
    return {
      ...tenant.rows[0],
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
    const base = `https://${tenant.rows[0]?.slug}.eyz.com`;
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
