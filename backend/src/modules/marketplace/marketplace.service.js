const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

const SUPPORTED_CHANNELS = ['amazon', 'ebay', 'instagram', 'tiktok', 'google'];

class MarketplaceService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT id, channel, display_name, status, last_sync_at, last_sync_status,
              last_sync_message, synced_product_count, settings, created_at
       FROM marketplace_integrations WHERE tenant_id = $1 ORDER BY created_at`,
      [tenantId]
    );
    // Present a row for every supported channel so the UI can show connect buttons
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
   * Pushes the active catalog to a connected channel. Real channel adapters
   * (Amazon SP-API, TikTok Shop, etc.) plug in here; this records the sync and
   * emits a `marketplace.sync` webhook so external middleware can react.
   */
  async syncNow(tenantId, channel) {
    const integration = await db.query(
      `SELECT * FROM marketplace_integrations WHERE tenant_id = $1 AND channel = $2 AND status = 'connected'`,
      [tenantId, channel]
    );
    if (!integration.rows[0]) throw new ValidationError('Channel is not connected');

    const products = await db.query(
      `SELECT id, name, sku, sale_price, stock_quantity, slug, description
       FROM products WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    let status = 'success';
    let message = `Synced ${products.rows.length} products to ${channel}`;
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
}

module.exports = new MarketplaceService();
module.exports.SUPPORTED_CHANNELS = SUPPORTED_CHANNELS;
