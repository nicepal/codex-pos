const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError } = require('../../shared/errors');

class InventoryService {
  constructor() {
    this.repo = new BaseRepository('inventory_transactions');
  }

  async list(tenantId, query) {
    return this.repo.findAll(tenantId, {
      page: query.page,
      limit: query.limit,
      filters: { transaction_type: query.type, product_id: query.product_id },
    });
  }

  async stockIn(tenantId, data, userId) {
    return this._adjustStock(tenantId, data, 'stock_in', userId);
  }

  async stockOut(tenantId, data, userId) {
    return this._adjustStock(tenantId, data, 'stock_out', userId, true);
  }

  async adjustment(tenantId, data, userId) {
    return this._adjustStock(tenantId, data, 'adjustment', userId);
  }

  async lowStock(tenantId) {
    return db.query(
      `SELECT id, name, sku, stock_quantity, low_stock_threshold
       FROM products WHERE tenant_id = $1 AND status = 'active'
         AND stock_quantity <= low_stock_threshold
       ORDER BY stock_quantity ASC`,
      [tenantId]
    ).then((r) => r.rows);
  }

  async _adjustStock(tenantId, data, type, userId, deduct = false) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const table = data.variant_id ? 'product_variants' : 'products';
      const id = data.variant_id || data.product_id;

      const current = await client.query(`SELECT stock_quantity FROM ${table} WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
      if (!current.rows[0]) throw new NotFoundError('Product not found');

      const prev = current.rows[0].stock_quantity;
      const qty = deduct ? -Math.abs(data.quantity) : Math.abs(data.quantity);
      const newQty = prev + qty;

      await client.query(`UPDATE ${table} SET stock_quantity = $1 WHERE id = $2`, [newQty, id]);

      const tx = await client.query(
        `INSERT INTO inventory_transactions (tenant_id, product_id, variant_id, transaction_type, quantity, previous_quantity, new_quantity, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [tenantId, data.product_id, data.variant_id, type, qty, prev, newQty, data.notes, userId]
      );

      const productInfo = data.product_id
        ? await client.query('SELECT name, low_stock_threshold FROM products WHERE id = $1', [data.product_id])
        : { rows: [] };

      await client.query('COMMIT');

      const threshold = productInfo.rows[0]?.low_stock_threshold ?? 10;
      if (data.product_id && newQty <= threshold) {
        setImmediate(async () => {
          try {
            const tenant = await db.query('SELECT name, email FROM tenants WHERE id = $1', [tenantId]);
            const settings = await db.query(
              `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'low_stock_alert'`,
              [tenantId]
            );
            const alertsEnabled = settings.rows[0]?.value !== false;
            if (!alertsEnabled) return;

            const emailService = require('../../services/email.service');
            await emailService.sendEmail({
              to: tenant.rows[0]?.email,
              subject: `Low Stock Alert: ${productInfo.rows[0]?.name}`,
              html: `<p>Product <strong>${productInfo.rows[0]?.name}</strong> is low on stock (${newQty} remaining).</p>`,
              tenantId,
              type: 'low_stock',
            });
          } catch (_) { /* non-blocking */ }
        });
      }

      return tx.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new InventoryService();
