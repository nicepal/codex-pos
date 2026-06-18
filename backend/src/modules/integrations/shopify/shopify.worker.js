const db = require('../../../config/database');
const logger = require('../../../utils/logger');
const { decrypt } = require('../../../utils/crypto');
const client = require('./shopify.client');
const mapper = require('./shopify.mapper');

const DEFAULT_SETTINGS = {
  importVariants: true,
  importImages: true,
  importInventory: true,
  importCollections: true,
  createMissingCategories: true,
  updateExisting: true,
};

function emit(tenantId, event, payload) {
  try {
    // Lazy require to avoid circular deps and tolerate realtime being disabled
    const { emitToTenant } = require('../../../realtime/socket');
    emitToTenant(tenantId, event, payload);
  } catch (_) { /* realtime optional */ }
}

async function loadJob(jobId, tenantId) {
  const res = await db.query(
    'SELECT * FROM shopify_import_jobs WHERE id = $1 AND tenant_id = $2',
    [jobId, tenantId]
  );
  return res.rows[0] || null;
}

async function loadConnection(connectionId, tenantId) {
  const res = await db.query(
    'SELECT * FROM shopify_connections WHERE id = $1 AND tenant_id = $2',
    [connectionId, tenantId]
  );
  return res.rows[0] || null;
}

// Determine the entity type of a JSONL line from its Shopify GID.
function lineType(obj) {
  const id = obj && obj.id ? String(obj.id) : '';
  if (id.includes('/Product/')) return 'product';
  if (id.includes('/ProductVariant/')) return 'variant';
  if (id.includes('/Collection/')) return 'collection';
  // Images from the product `images` connection have a url and a __parentId
  if (obj.__parentId && (obj.url || obj.src)) return 'image';
  return 'unknown';
}

/**
 * Process a Shopify import job: run the bulk export, stream JSONL, reassemble
 * products from the flattened output, upsert each, track progress + totals.
 */
async function processShopifyImport(job) {
  const { jobId, tenantId, connectionId } = job.data;
  const startedAt = Date.now();

  const jobRow = await loadJob(jobId, tenantId);
  if (!jobRow) {
    logger.warn('Shopify import job not found', { jobId, tenantId });
    return;
  }
  const settings = { ...DEFAULT_SETTINGS, ...(jobRow.settings || {}) };
  const type = jobRow.type || 'full';

  const counters = {
    products_imported: 0,
    products_updated: 0,
    variants_imported: 0,
    images_imported: 0,
    collections_imported: 0,
    errors: 0,
  };
  const errorLog = [];

  await db.query(
    `UPDATE shopify_import_jobs SET status = 'running', started_at = NOW(), progress = 0 WHERE id = $1 AND tenant_id = $2`,
    [jobId, tenantId]
  );
  emit(tenantId, 'shopify.import.progress', { jobId, status: 'running', progress: 0, totals: counters });

  try {
    const connection = await loadConnection(connectionId, tenantId);
    if (!connection) throw new Error('Shopify connection not found');
    const token = decrypt(connection.access_token);
    const shop = connection.shop_url;
    const apiVersion = connection.api_version || client.DEFAULT_API_VERSION;

    // Incremental: only products updated since last sync
    let updatedAtMin = null;
    if (type === 'incremental' && connection.last_sync_at) {
      updatedAtMin = new Date(connection.last_sync_at).toISOString();
    }

    // 1. Start bulk export
    await client.startBulkProductExport(shop, token, { updatedAtMin, apiVersion });

    // 2. Poll until complete, surface poll status as indeterminate progress
    const op = await client.pollBulkOperation(shop, token, {
      apiVersion,
      onTick: (o) => emit(tenantId, 'shopify.import.progress', {
        jobId, status: 'running', progress: jobRow.progress || 1, phase: 'exporting', objectCount: o.objectCount, totals: counters,
      }),
    });

    const totalObjects = parseInt(op.objectCount, 10) || 0;

    // 3. Stream + reassemble products from flattened JSONL
    let current = null;
    let processedObjects = 0;
    let lastEmit = 0;

    const flush = async () => {
      if (!current) return;
      const assembled = current;
      current = null;
      const res = await mapper.upsertProduct(tenantId, connectionId, assembled, settings, counters);
      if (res.errors && res.errors.length) {
        for (const e of res.errors) {
          if (errorLog.length < 200) errorLog.push(e);
        }
      }
    };

    await client.streamJsonl(op.url, async (obj) => {
      processedObjects += 1;
      const t = lineType(obj);
      if (t === 'product') {
        await flush();
        current = { ...obj, variants: [], images: [], collections: [] };
      } else if (current) {
        if (t === 'variant') current.variants.push(obj);
        else if (t === 'image') current.images.push(obj);
        else if (t === 'collection') current.collections.push(obj);
      }

      // Periodic progress update (throttled)
      if (totalObjects > 0 && processedObjects - lastEmit >= 25) {
        lastEmit = processedObjects;
        const progress = Math.min(99, Math.round((processedObjects / totalObjects) * 100));
        await db.query(
          `UPDATE shopify_import_jobs SET progress = $1, totals = $2 WHERE id = $3 AND tenant_id = $4`,
          [progress, JSON.stringify(counters), jobId, tenantId]
        );
        emit(tenantId, 'shopify.import.progress', { jobId, status: 'running', progress, totals: counters, phase: 'importing' });
      }
    });

    // Flush the final buffered product
    await flush();

    // Count distinct collections mapped
    const colCount = await db.query('SELECT COUNT(*)::int AS c FROM shopify_collection_map WHERE tenant_id = $1', [tenantId]);
    counters.collections_imported = colCount.rows[0] ? colCount.rows[0].c : 0;

    const durationMs = Date.now() - startedAt;
    await db.query(
      `UPDATE shopify_import_jobs
         SET status = 'completed', progress = 100, totals = $1, error_log = $2,
             finished_at = NOW(), duration_ms = $3,
             message = $4
       WHERE id = $5 AND tenant_id = $6`,
      [
        JSON.stringify(counters),
        JSON.stringify(errorLog),
        durationMs,
        `Imported ${counters.products_imported} new, updated ${counters.products_updated}`,
        jobId, tenantId,
      ]
    );

    const connUpdate = type === 'full'
      ? `UPDATE shopify_connections SET last_sync_at = NOW(), last_full_import_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`
      : `UPDATE shopify_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`;
    await db.query(connUpdate, [connectionId, tenantId]);

    emit(tenantId, 'shopify.import.progress', {
      jobId, status: 'completed', progress: 100, totals: counters, durationMs,
    });
    emit(tenantId, 'shopify.import.completed', { jobId, totals: counters });
    logger.info('Shopify import completed', { jobId, tenantId, totals: counters });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    logger.error('Shopify import failed', { jobId, tenantId, error: err.message });
    errorLog.push({ type: 'fatal', message: err.message });
    await db.query(
      `UPDATE shopify_import_jobs
         SET status = 'failed', totals = $1, error_log = $2, finished_at = NOW(), duration_ms = $3, message = $4
       WHERE id = $5 AND tenant_id = $6`,
      [JSON.stringify(counters), JSON.stringify(errorLog), durationMs, err.message, jobId, tenantId]
    );
    await db.query(
      `UPDATE shopify_connections SET status = 'error', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [connectionId, tenantId]
    ).catch(() => {});
    emit(tenantId, 'shopify.import.progress', { jobId, status: 'failed', error: err.message, totals: counters });
  }
}

module.exports = { processShopifyImport };
