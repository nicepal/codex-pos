const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { generateOrderNumber } = require('../../utils/helpers');
const inventoryService = require('../inventory/inventory.service');

class TransferService {
  async list(tenantId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const count = await db.query('SELECT COUNT(*)::int AS total FROM stock_transfers WHERE tenant_id = $1', [tenantId]);
    const rows = await db.query(
      `SELECT st.*, fb.name AS from_branch_name, tb.name AS to_branch_name
       FROM stock_transfers st
       JOIN branches fb ON fb.id = st.from_branch_id
       JOIN branches tb ON tb.id = st.to_branch_id
       WHERE st.tenant_id = $1 ORDER BY st.created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(tenantId, id) {
    const transfer = await db.query(
      `SELECT st.*, fb.name AS from_branch_name, tb.name AS to_branch_name
       FROM stock_transfers st
       JOIN branches fb ON fb.id = st.from_branch_id
       JOIN branches tb ON tb.id = st.to_branch_id
       WHERE st.id = $1 AND st.tenant_id = $2`,
      [id, tenantId]
    );
    if (!transfer.rows[0]) throw new NotFoundError('Transfer not found');
    const items = await db.query(
      `SELECT sti.*, p.name AS product_name FROM stock_transfer_items sti
       JOIN products p ON p.id = sti.product_id WHERE sti.transfer_id = $1`,
      [id]
    );
    return { ...transfer.rows[0], items: items.rows };
  }

  async create(tenantId, data, userId) {
    if (!data.items?.length) throw new ValidationError('Transfer must have items');
    if (data.from_branch_id === data.to_branch_id) throw new ValidationError('Branches must differ');

    const transferNumber = `TRF-${generateOrderNumber().slice(-8)}`;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const tr = await client.query(
        `INSERT INTO stock_transfers (tenant_id, transfer_number, from_branch_id, to_branch_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenantId, transferNumber, data.from_branch_id, data.to_branch_id, data.notes || null, userId]
      );
      const transfer = tr.rows[0];

      for (const item of data.items) {
        const qty = parseInt(item.quantity, 10);
        if (!qty || qty < 1) throw new ValidationError('Invalid quantity');
        await client.query(
          `INSERT INTO stock_transfer_items (tenant_id, transfer_id, product_id, variant_id, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, transfer.id, item.product_id, item.variant_id || null, qty]
        );
      }
      await client.query('COMMIT');
      return this.getById(tenantId, transfer.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async complete(tenantId, id, userId) {
    const transfer = await this.getById(tenantId, id);
    if (transfer.status === 'completed') throw new ValidationError('Transfer already completed');
    if (transfer.status === 'cancelled') throw new ValidationError('Transfer was cancelled');

    const branchStockService = require('../inventory/branch-stock.service');
    await branchStockService.transfer(
      tenantId,
      transfer.from_branch_id,
      transfer.to_branch_id,
      transfer.items.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
      userId,
      id,
      `Transfer ${transfer.transfer_number}`
    );

    await db.query(
      `UPDATE stock_transfers SET status = 'completed', completed_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return this.getById(tenantId, id);
  }
}

module.exports = new TransferService();
