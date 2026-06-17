const db = require('../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');

class CatalogTrackingService {
  async listSerials(tenantId, productId) {
    await this._ensureProduct(tenantId, productId);
    const result = await db.query(
      `SELECT ps.*, b.name AS branch_name FROM product_serials ps
       LEFT JOIN branches b ON b.id = ps.branch_id
       WHERE ps.tenant_id = $1 AND ps.product_id = $2 ORDER BY ps.created_at DESC`,
      [tenantId, productId]
    );
    return result.rows;
  }

  async addSerial(tenantId, productId, data) {
    await this._ensureProduct(tenantId, productId);
    const serial = String(data.serial_number || '').trim();
    if (!serial) throw new ValidationError('Serial number is required');

    try {
      const result = await db.query(
        `INSERT INTO product_serials (tenant_id, product_id, variant_id, serial_number, branch_id, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'in_stock') RETURNING *`,
        [tenantId, productId, data.variant_id || null, serial, data.branch_id || null, data.notes || null]
      );
      await db.query(
        'UPDATE products SET tracks_serials = true WHERE id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ConflictError('Serial number already exists');
      throw err;
    }
  }

  async removeSerial(tenantId, productId, serialId) {
    const result = await db.query(
      `DELETE FROM product_serials WHERE id = $1 AND product_id = $2 AND tenant_id = $3 RETURNING id`,
      [serialId, productId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Serial not found');
    return { deleted: true };
  }

  async listBatches(tenantId, productId) {
    await this._ensureProduct(tenantId, productId);
    const result = await db.query(
      `SELECT pb.*, b.name AS branch_name FROM product_batches pb
       LEFT JOIN branches b ON b.id = pb.branch_id
       WHERE pb.tenant_id = $1 AND pb.product_id = $2 ORDER BY pb.expiry_date ASC NULLS LAST, pb.created_at DESC`,
      [tenantId, productId]
    );
    return result.rows;
  }

  async addBatch(tenantId, productId, data) {
    await this._ensureProduct(tenantId, productId);
    const batchNumber = String(data.batch_number || '').trim();
    if (!batchNumber) throw new ValidationError('Batch number is required');
    const qty = parseInt(data.quantity, 10);
    if (!qty || qty < 0) throw new ValidationError('Invalid quantity');

    try {
      const result = await db.query(
        `INSERT INTO product_batches (tenant_id, product_id, variant_id, branch_id, batch_number, expiry_date, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tenantId, productId, data.variant_id || null, data.branch_id || null, batchNumber, data.expiry_date || null, qty]
      );
      await db.query(
        'UPDATE products SET tracks_batches = true WHERE id = $1 AND tenant_id = $2',
        [productId, tenantId]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ConflictError('Batch number already exists for this product');
      throw err;
    }
  }

  async removeBatch(tenantId, productId, batchId) {
    const result = await db.query(
      `DELETE FROM product_batches WHERE id = $1 AND product_id = $2 AND tenant_id = $3 RETURNING id`,
      [batchId, productId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Batch not found');
    return { deleted: true };
  }

  async _ensureProduct(tenantId, productId) {
    const p = await db.query('SELECT id FROM products WHERE id = $1 AND tenant_id = $2', [productId, tenantId]);
    if (!p.rows[0]) throw new NotFoundError('Product not found');
  }
}

module.exports = new CatalogTrackingService();
