const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const inventoryService = require('../inventory/inventory.service');

class PurchaseOrderService {
  async list(tenantId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const count = await db.query('SELECT COUNT(*)::int AS total FROM purchase_orders WHERE tenant_id = $1', [tenantId]);
    const rows = await db.query(
      `SELECT po.*, s.name AS supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.tenant_id = $1
       ORDER BY po.created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    const total = count.rows[0].total;
    return {
      rows: rows.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(tenantId, id) {
    const po = await db.query(
      `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1 AND po.tenant_id = $2`,
      [id, tenantId]
    );
    if (!po.rows[0]) throw new NotFoundError('Purchase order not found');

    const items = await db.query(
      `SELECT poi.*, p.name AS product_name FROM purchase_order_items poi
       LEFT JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1 AND poi.tenant_id = $2`,
      [id, tenantId]
    );

    return { ...po.rows[0], items: items.rows };
  }

  async create(tenantId, data, userId) {
    const poNumber = data.po_number || `PO-${Date.now().toString(36).toUpperCase()}`;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      let total = 0;
      const poResult = await client.query(
        `INSERT INTO purchase_orders (tenant_id, supplier_id, po_number, status, total_amount, notes, ordered_at, created_by)
         VALUES ($1, $2, $3, $4, 0, $5, NOW(), $6) RETURNING *`,
        [tenantId, data.supplier_id, poNumber, data.status || 'ordered', data.notes, userId]
      );
      const poId = poResult.rows[0].id;

      for (const item of data.items || []) {
        const lineTotal = item.quantity * item.unit_cost;
        total += lineTotal;
        await client.query(
          `INSERT INTO purchase_order_items (tenant_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tenantId, poId, item.product_id, item.quantity, item.unit_cost, lineTotal]
        );
      }

      await client.query('UPDATE purchase_orders SET total_amount = $1 WHERE id = $2', [total, poId]);
      await client.query('COMMIT');
      return this.getById(tenantId, poId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async receive(tenantId, id, userId) {
    const po = await this.getById(tenantId, id);
    if (po.status === 'received') throw new ValidationError('Purchase order already received');
    if (po.status === 'cancelled') throw new ValidationError('Cannot receive cancelled PO');

    for (const item of po.items) {
      if (!item.product_id) continue;
      const qty = item.quantity - (item.received_quantity || 0);
      if (qty > 0) {
        await inventoryService.stockIn(tenantId, {
          product_id: item.product_id,
          quantity: qty,
          notes: `Received from PO ${po.po_number}`,
        }, userId);
        await db.query(
          'UPDATE purchase_order_items SET received_quantity = quantity WHERE id = $1',
          [item.id]
        );
      }
    }

    await db.query(
      `UPDATE purchase_orders SET status = 'received', received_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return this.getById(tenantId, id);
  }
}

module.exports = new PurchaseOrderService();
