const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const branchStockService = require('../inventory/branch-stock.service');

class ManufacturingService {
  async listBoms(tenantId) {
    const result = await db.query(
      `SELECT b.*, p.name AS product_name, p.sku AS product_sku
       FROM boms b
       JOIN products p ON p.id = b.product_id
       WHERE b.tenant_id = $1
       ORDER BY b.created_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  async getBom(tenantId, id) {
    const bom = await db.query(
      `SELECT b.*, p.name AS product_name FROM boms b
       JOIN products p ON p.id = b.product_id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [id, tenantId]
    );
    if (!bom.rows[0]) throw new NotFoundError('BOM not found');
    const items = await db.query(
      `SELECT bi.*, p.name AS component_name, p.sku AS component_sku
       FROM bom_items bi
       JOIN products p ON p.id = bi.component_product_id
       WHERE bi.bom_id = $1 AND bi.tenant_id = $2`,
      [id, tenantId]
    );
    return { ...bom.rows[0], items: items.rows };
  }

  async createBom(tenantId, data) {
    if (!data.product_id || !data.name) {
      throw new ValidationError('product_id and name are required');
    }
    const product = await db.query(
      `SELECT id FROM products WHERE id = $1 AND tenant_id = $2`,
      [data.product_id, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const bom = await client.query(
        `INSERT INTO boms (tenant_id, product_id, name, output_qty)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, data.product_id, data.name, parseInt(data.output_qty, 10) || 1]
      );
      const items = Array.isArray(data.items) ? data.items : [];
      for (const item of items) {
        if (!item.component_product_id) continue;
        await client.query(
          `INSERT INTO bom_items (tenant_id, bom_id, component_product_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [tenantId, bom.rows[0].id, item.component_product_id, Number(item.quantity) || 1]
        );
      }
      await client.query('COMMIT');
      return this.getBom(tenantId, bom.rows[0].id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBom(tenantId, id, data) {
    const existing = await this.getBom(tenantId, id);
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE boms SET name = COALESCE($3, name), output_qty = COALESCE($4, output_qty),
                          product_id = COALESCE($5, product_id)
         WHERE id = $1 AND tenant_id = $2`,
        [
          id,
          tenantId,
          data.name || null,
          data.output_qty != null ? parseInt(data.output_qty, 10) : null,
          data.product_id || null,
        ]
      );
      if (Array.isArray(data.items)) {
        await client.query(`DELETE FROM bom_items WHERE bom_id = $1 AND tenant_id = $2`, [id, tenantId]);
        for (const item of data.items) {
          if (!item.component_product_id) continue;
          await client.query(
            `INSERT INTO bom_items (tenant_id, bom_id, component_product_id, quantity)
             VALUES ($1, $2, $3, $4)`,
            [tenantId, id, item.component_product_id, Number(item.quantity) || 1]
          );
        }
      }
      await client.query('COMMIT');
      return this.getBom(tenantId, existing.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteBom(tenantId, id) {
    const result = await db.query(
      `DELETE FROM boms WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('BOM not found');
    return { deleted: true };
  }

  async listProductionOrders(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM production_orders WHERE tenant_id = $1`,
      [tenantId]
    );
    const rows = await db.query(
      `SELECT po.*, b.name AS bom_name, b.product_id
       FROM production_orders po
       JOIN boms b ON b.id = po.bom_id
       WHERE po.tenant_id = $1
       ORDER BY po.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async createProductionOrder(tenantId, data, userId) {
    if (!data.bom_id) throw new ValidationError('bom_id is required');
    const bom = await this.getBom(tenantId, data.bom_id);
    const qty = parseInt(data.quantity, 10) || 1;
    if (qty < 1) throw new ValidationError('quantity must be at least 1');

    const result = await db.query(
      `INSERT INTO production_orders (tenant_id, bom_id, quantity, status, branch_id, created_by)
       VALUES ($1, $2, $3, 'draft', $4, $5) RETURNING *`,
      [tenantId, bom.id, qty, data.branch_id || null, userId || null]
    );
    return result.rows[0];
  }

  async completeProductionOrder(tenantId, id, userId) {
    const orderRes = await db.query(
      `SELECT * FROM production_orders WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    const order = orderRes.rows[0];
    if (!order) throw new NotFoundError('Production order not found');
    if (order.status === 'completed') throw new ValidationError('Production order already completed');

    const bom = await this.getBom(tenantId, order.bom_id);
    const branchId = order.branch_id || await branchStockService.getDefaultBranchId(tenantId);
    const factor = Number(order.quantity) || 1;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const item of bom.items) {
        const consumeQty = Math.ceil(Number(item.quantity) * factor);
        await branchStockService.adjust(tenantId, {
          branch_id: branchId,
          product_id: item.component_product_id,
          quantity: consumeQty,
          reference_type: 'production',
          reference_id: id,
          notes: `BOM consume for ${bom.name}`,
        }, 'stock_out', userId, client);
      }

      const outputQty = (Number(bom.output_qty) || 1) * factor;
      await branchStockService.adjust(tenantId, {
        branch_id: branchId,
        product_id: bom.product_id,
        quantity: outputQty,
        reference_type: 'production',
        reference_id: id,
        notes: `Production complete: ${bom.name}`,
      }, 'stock_in', userId, client);

      const updated = await client.query(
        `UPDATE production_orders
         SET status = 'completed', completed_at = NOW(), branch_id = COALESCE(branch_id, $3)
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [id, tenantId, branchId]
      );
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new ManufacturingService();
