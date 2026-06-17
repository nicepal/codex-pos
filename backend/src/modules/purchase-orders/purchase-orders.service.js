const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const inventoryService = require('../inventory/inventory.service');
const branchStockService = require('../inventory/branch-stock.service');

class PurchaseOrderService {
  async list(tenantId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const count = await db.query('SELECT COUNT(*)::int AS total FROM purchase_orders WHERE tenant_id = $1', [tenantId]);
    const rows = await db.query(
      `SELECT po.*, s.name AS supplier_name,
              COALESCE((
                SELECT SUM(poi.quantity)::int FROM purchase_order_items poi
                WHERE poi.purchase_order_id = po.id AND poi.tenant_id = $1
              ), 0) AS total_items,
              COALESCE((
                SELECT SUM(poi.received_quantity)::int FROM purchase_order_items poi
                WHERE poi.purchase_order_id = po.id AND poi.tenant_id = $1
              ), 0) AS received_items
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
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new ValidationError('At least one item is required');
      }

      const poResult = await client.query(
        `INSERT INTO purchase_orders (tenant_id, supplier_id, po_number, status, total_amount, notes, ordered_at, created_by)
         VALUES ($1, $2, $3, $4, 0, $5, NOW(), $6) RETURNING *`,
        [tenantId, data.supplier_id, poNumber, data.status || 'draft', data.notes, userId]
      );
      const poId = poResult.rows[0].id;

      for (const item of data.items || []) {
        if (!item.product_id) continue;
        const qty = parseInt(item.quantity, 10) || 0;
        const cost = parseFloat(item.unit_cost) || 0;
        if (qty <= 0) throw new ValidationError('Quantity must be greater than 0');
        if (cost < 0) throw new ValidationError('Unit cost must be 0 or greater');
        const lineTotal = qty * cost;
        total += lineTotal;
        await client.query(
          `INSERT INTO purchase_order_items (tenant_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tenantId, poId, item.product_id, qty, cost, lineTotal]
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

  async receive(tenantId, id, userId, payload = {}) {
    const po = await this.getById(tenantId, id);
    if (po.status === 'received') throw new ValidationError('Purchase order already received');
    if (po.status === 'cancelled') throw new ValidationError('Cannot receive cancelled PO');
    if (po.status === 'draft') throw new ValidationError('Mark the PO as ordered before receiving');

    const requested = new Map((payload.items || []).map((i) => [i.id, parseInt(i.quantity, 10) || 0]));
    let anyReceived = false;
    for (const item of po.items) {
      if (!item.product_id) continue;
      const pending = item.quantity - (item.received_quantity || 0);
      if (pending <= 0) continue;
      const qty = requested.size ? Math.min(requested.get(item.id) || 0, pending) : pending;
      if (qty > 0) {
        anyReceived = true;
        const branchId = po.branch_id || await branchStockService.getDefaultBranchId(tenantId);
        await branchStockService.adjust(tenantId, {
          branch_id: branchId,
          product_id: item.product_id,
          quantity: qty,
          reference_type: 'purchase_order',
          reference_id: id,
          notes: `Received from PO ${po.po_number}`,
        }, 'purchase', userId);
        await db.query(
          'UPDATE purchase_order_items SET received_quantity = COALESCE(received_quantity, 0) + $1 WHERE id = $2',
          [qty, item.id]
        );
      }
    }
    if (!anyReceived) throw new ValidationError('No quantities were received');

    const totals = await db.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS total_qty,
              COALESCE(SUM(received_quantity), 0)::int AS received_qty
       FROM purchase_order_items WHERE purchase_order_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    const isFullyReceived = totals.rows[0].total_qty > 0 && totals.rows[0].total_qty === totals.rows[0].received_qty;
    const nextStatus = isFullyReceived ? 'received' : 'ordered';

    if (nextStatus === 'received') {
      await db.query(
        `UPDATE purchase_orders SET status = $1, received_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [nextStatus, id, tenantId]
      );
    } else {
      await db.query(
        `UPDATE purchase_orders SET status = $1 WHERE id = $2 AND tenant_id = $3`,
        [nextStatus, id, tenantId]
      );
    }
    return this.getById(tenantId, id);
  }

  async updateStatus(tenantId, id, status) {
    const allowed = ['draft', 'ordered', 'cancelled'];
    if (!allowed.includes(status)) throw new ValidationError('Invalid status');
    const po = await this.getById(tenantId, id);
    if (po.status === 'received') throw new ValidationError('Received purchase order cannot be modified');
    if (po.status === 'cancelled' && status !== 'cancelled') throw new ValidationError('Cancelled purchase order cannot be reopened');
    if (status === 'draft' && po.status !== 'draft') throw new ValidationError('Cannot move non-draft PO back to draft');

    if (status === 'ordered') {
      await db.query(
        `UPDATE purchase_orders
         SET status = $1, ordered_at = COALESCE(ordered_at, NOW())
         WHERE id = $2 AND tenant_id = $3`,
        [status, id, tenantId]
      );
    } else {
      await db.query(
        `UPDATE purchase_orders SET status = $1 WHERE id = $2 AND tenant_id = $3`,
        [status, id, tenantId]
      );
    }
    return this.getById(tenantId, id);
  }

  async remove(tenantId, id) {
    const po = await this.getById(tenantId, id);
    if (po.status !== 'draft') throw new ValidationError('Only draft purchase orders can be deleted');
    await db.query('DELETE FROM purchase_orders WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return { deleted: true };
  }
}

module.exports = new PurchaseOrderService();
