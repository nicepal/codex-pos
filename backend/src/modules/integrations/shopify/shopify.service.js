const db = require('../../../config/database');
const { NotFoundError, ConflictError, AppError } = require('../../../shared/errors');
const { encrypt, decrypt, mask } = require('../../../utils/crypto');
const client = require('./shopify.client');
const { addShopifyImportJob } = require('../../../workers/queues');

function publicConnection(row, activeJob = null, lastJob = null) {
  if (!row) return { connected: false };
  let tokenMask = '';
  try {
    tokenMask = mask(decrypt(row.access_token));
  } catch (_) {
    tokenMask = '••••';
  }
  return {
    connected: row.status === 'connected',
    id: row.id,
    store_name: row.store_name,
    shop_url: row.shop_url,
    api_version: row.api_version,
    status: row.status,
    access_token_masked: tokenMask,
    connected_at: row.connected_at,
    last_sync_at: row.last_sync_at,
    last_full_import_at: row.last_full_import_at,
    active_job: activeJob || null,
    last_job: lastJob || null,
  };
}

class ShopifyService {
  async getConnectionRow(tenantId) {
    const res = await db.query('SELECT * FROM shopify_connections WHERE tenant_id = $1', [tenantId]);
    return res.rows[0] || null;
  }

  async connect(tenantId, { shop_url, access_token }, userId) {
    const shop = client.normalizeShopUrl(shop_url);
    const apiVersion = client.DEFAULT_API_VERSION;

    // Verify the credentials before storing anything
    const shopInfo = await client.verifyConnection(shop, access_token, { apiVersion });

    const encrypted = encrypt(access_token);
    const existing = await this.getConnectionRow(tenantId);

    if (existing) {
      const updated = await db.query(
        `UPDATE shopify_connections
           SET store_name = $1, shop_url = $2, access_token = $3, api_version = $4,
               status = 'connected', connected_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $5 RETURNING *`,
        [shopInfo.name, shop, encrypted, apiVersion, tenantId]
      );
      return publicConnection(updated.rows[0]);
    }

    const inserted = await db.query(
      `INSERT INTO shopify_connections
         (tenant_id, store_name, shop_url, access_token, api_version, status, connected_at)
       VALUES ($1, $2, $3, $4, $5, 'connected', NOW()) RETURNING *`,
      [tenantId, shopInfo.name, shop, encrypted, apiVersion]
    );
    return publicConnection(inserted.rows[0]);
  }

  async getStatus(tenantId) {
    const row = await this.getConnectionRow(tenantId);
    if (!row) return { connected: false };

    const active = await db.query(
      `SELECT * FROM shopify_import_jobs
       WHERE tenant_id = $1 AND status IN ('queued','running')
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    const last = await db.query(
      `SELECT * FROM shopify_import_jobs
       WHERE tenant_id = $1 AND status IN ('completed','failed')
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return publicConnection(row, active.rows[0] || null, last.rows[0] || null);
  }

  async disconnect(tenantId) {
    const row = await this.getConnectionRow(tenantId);
    if (!row) throw new NotFoundError('No Shopify store connected');
    await db.query('DELETE FROM shopify_connections WHERE tenant_id = $1', [tenantId]);
    return { connected: false };
  }

  async startImport(tenantId, { type = 'full', settings = {} } = {}, userId) {
    const row = await this.getConnectionRow(tenantId);
    if (!row) throw new NotFoundError('Connect a Shopify store before importing');
    if (row.status !== 'connected') throw new AppError('Shopify connection is not active. Reconnect your store.', 400, 'NOT_CONNECTED');

    const active = await db.query(
      `SELECT id FROM shopify_import_jobs WHERE tenant_id = $1 AND status IN ('queued','running') LIMIT 1`,
      [tenantId]
    );
    if (active.rows[0]) {
      throw new ConflictError('An import is already in progress for this store');
    }

    const job = await db.query(
      `INSERT INTO shopify_import_jobs (tenant_id, connection_id, type, status, settings, totals, created_by)
       VALUES ($1, $2, $3, 'queued', $4, '{}'::jsonb, $5) RETURNING *`,
      [tenantId, row.id, type, JSON.stringify(settings || {}), userId || null]
    );
    const jobRow = job.rows[0];

    await addShopifyImportJob({ jobId: jobRow.id, tenantId, connectionId: row.id });
    return jobRow;
  }

  async sync(tenantId, userId) {
    return this.startImport(tenantId, { type: 'incremental', settings: {} }, userId);
  }

  async listJobs(tenantId, { limit = 20 } = {}) {
    const res = await db.query(
      `SELECT id, type, status, progress, totals, message, started_at, finished_at, duration_ms, created_at
       FROM shopify_import_jobs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, Math.min(parseInt(limit, 10) || 20, 100)]
    );
    return res.rows;
  }

  async getJob(tenantId, jobId) {
    const res = await db.query(
      'SELECT * FROM shopify_import_jobs WHERE tenant_id = $1 AND id = $2',
      [tenantId, jobId]
    );
    if (!res.rows[0]) throw new NotFoundError('Import job not found');
    return res.rows[0];
  }
}

module.exports = new ShopifyService();
