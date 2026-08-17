const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const logger = require('../../utils/logger');

// amazon/ebay/instagram/tiktok/google remain stubs pending official APIs;
// woocommerce is a real REST adapter using consumer key/secret.
const SUPPORTED_CHANNELS = ['amazon', 'ebay', 'instagram', 'tiktok', 'google', 'woocommerce'];

class MarketplaceService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT id, channel, display_name, status, last_sync_at, last_sync_status,
              last_sync_message, synced_product_count, settings, created_at
       FROM marketplace_integrations WHERE tenant_id = $1 ORDER BY created_at`,
      [tenantId]
    );
    const byChannel = Object.fromEntries(result.rows.map((r) => [r.channel, r]));
    return SUPPORTED_CHANNELS.map((channel) => byChannel[channel] || {
      channel, status: 'disconnected', display_name: null, synced_product_count: 0,
    });
  }

  async connect(tenantId, data) {
    const channel = (data.channel || '').toLowerCase();
    if (!SUPPORTED_CHANNELS.includes(channel)) throw new ValidationError('Unsupported marketplace channel');

    const result = await db.query(
      `INSERT INTO marketplace_integrations (tenant_id, channel, display_name, status, credentials, settings)
       VALUES ($1, $2, $3, 'connected', $4, $5)
       ON CONFLICT (tenant_id, channel) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             status = 'connected',
             credentials = EXCLUDED.credentials,
             settings = EXCLUDED.settings,
             updated_at = NOW()
       RETURNING id, channel, display_name, status, settings, created_at`,
      [tenantId, channel, data.display_name || channel, JSON.stringify(data.credentials || {}), JSON.stringify(data.settings || {})]
    );
    return result.rows[0];
  }

  async disconnect(tenantId, channel) {
    const result = await db.query(
      `UPDATE marketplace_integrations SET status = 'disconnected', updated_at = NOW()
       WHERE tenant_id = $1 AND channel = $2 RETURNING id`,
      [tenantId, channel]
    );
    if (!result.rows[0]) throw new NotFoundError('Integration not found');
    return { disconnected: true };
  }

  /**
   * Syncs catalog with a connected channel.
   * - woocommerce: pulls products via WooCommerce REST API and upserts locally
   * - other channels: prepare local catalog + webhook for external middleware
   *   (Amazon SP-API / TikTok Shop / eBay Sell / Meta Commerce stubs)
   */
  async syncNow(tenantId, channel) {
    const integration = await db.query(
      `SELECT * FROM marketplace_integrations WHERE tenant_id = $1 AND channel = $2 AND status = 'connected'`,
      [tenantId, channel]
    );
    if (!integration.rows[0]) throw new ValidationError('Channel is not connected');

    if (channel === 'woocommerce') {
      return this._syncWooCommerce(tenantId, integration.rows[0]);
    }

    const products = await db.query(
      `SELECT id, name, sku, sale_price, stock_quantity, slug, description
       FROM products WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    let status = 'success';
    let message = `Synced ${products.rows.length} products to ${channel} (stub adapter — connect official API credentials for live push)`;
    try {
      const webhookService = require('../webhooks/webhooks.service');
      await webhookService.dispatch(tenantId, 'marketplace.sync', {
        channel,
        product_count: products.rows.length,
        products: products.rows,
      });
    } catch (err) {
      status = 'partial';
      message = `Catalog prepared (${products.rows.length} products); webhook dispatch failed: ${err.message}`;
    }

    const updated = await db.query(
      `UPDATE marketplace_integrations
       SET last_sync_at = NOW(), last_sync_status = $3, last_sync_message = $4, synced_product_count = $5, updated_at = NOW()
       WHERE tenant_id = $1 AND channel = $2 RETURNING *`,
      [tenantId, channel, status, message, products.rows.length]
    );
    return updated.rows[0];
  }

  async _syncWooCommerce(tenantId, integration) {
    const creds = typeof integration.credentials === 'string'
      ? JSON.parse(integration.credentials)
      : (integration.credentials || {});
    const storeUrl = String(creds.store_url || creds.url || '').replace(/\/$/, '');
    const consumerKey = creds.consumer_key || creds.key;
    const consumerSecret = creds.consumer_secret || creds.secret;
    if (!storeUrl || !consumerKey || !consumerSecret) {
      throw new ValidationError('WooCommerce requires store_url, consumer_key, and consumer_secret in credentials');
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    let page = 1;
    let imported = 0;
    let errors = 0;

    try {
      while (page <= 20) {
        const url = `${storeUrl}/wp-json/wc/v3/products?per_page=50&page=${page}&status=publish`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`WooCommerce API ${res.status}: ${text.slice(0, 200)}`);
        }
        const products = await res.json();
        if (!Array.isArray(products) || products.length === 0) break;

        for (const wp of products) {
          try {
            await this._upsertFromWoo(tenantId, wp);
            imported += 1;
          } catch (err) {
            errors += 1;
            logger.warn('WooCommerce product upsert failed', { sku: wp.sku, error: err.message });
          }
        }
        if (products.length < 50) break;
        page += 1;
      }
    } catch (err) {
      await db.query(
        `UPDATE marketplace_integrations
         SET last_sync_at = NOW(), last_sync_status = 'failed', last_sync_message = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND channel = $2`,
        [tenantId, 'woocommerce', err.message]
      );
      throw new ValidationError(`WooCommerce sync failed: ${err.message}`);
    }

    const message = `Imported ${imported} WooCommerce products` + (errors ? ` (${errors} errors)` : '');
    const updated = await db.query(
      `UPDATE marketplace_integrations
       SET last_sync_at = NOW(), last_sync_status = $3, last_sync_message = $4,
           synced_product_count = $5, updated_at = NOW()
       WHERE tenant_id = $1 AND channel = $2 RETURNING *`,
      [tenantId, 'woocommerce', errors ? 'partial' : 'success', message, imported]
    );

    try {
      const webhookService = require('../webhooks/webhooks.service');
      await webhookService.dispatch(tenantId, 'marketplace.sync', {
        channel: 'woocommerce',
        product_count: imported,
      });
    } catch (_) { /* optional */ }

    return updated.rows[0];
  }

  async _upsertFromWoo(tenantId, wp) {
    const sku = wp.sku || `woo-${wp.id}`;
    const name = wp.name || sku;
    const price = parseFloat(wp.sale_price || wp.regular_price || wp.price || 0) || 0;
    const stock = wp.manage_stock ? (parseInt(wp.stock_quantity, 10) || 0) : 0;
    const description = wp.short_description || wp.description || null;
    const slug = (wp.slug || name).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180);

    const existing = await db.query(
      `SELECT id FROM products WHERE tenant_id = $1 AND sku = $2 LIMIT 1`,
      [tenantId, sku]
    );
    if (existing.rows[0]) {
      await db.query(
        `UPDATE products
         SET name = $3, sale_price = $4, stock_quantity = $5, description = COALESCE($6, description),
             updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [existing.rows[0].id, tenantId, name, price, stock, description]
      );
      return existing.rows[0].id;
    }

    const inserted = await db.query(
      `INSERT INTO products
         (tenant_id, name, sku, slug, sale_price, stock_quantity, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING id`,
      [tenantId, name, sku, `${slug}-${Date.now().toString(36)}`, price, stock, description]
    );
    return inserted.rows[0].id;
  }
}

module.exports = new MarketplaceService();
module.exports.SUPPORTED_CHANNELS = SUPPORTED_CHANNELS;
