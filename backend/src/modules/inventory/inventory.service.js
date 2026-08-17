const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const branchStockService = require('./branch-stock.service');

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
    const signed = parseInt(data.quantity, 10);
    const deduct = data.deduct === true || (Number.isFinite(signed) && signed < 0);
    return this._adjustStock(tenantId, { ...data, deduct }, 'adjustment', userId, deduct);
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

  async createStockTake(tenantId, data, userId) {
    const open = await db.query(
      `SELECT * FROM stock_take_sessions WHERE tenant_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    if (open.rows[0] && !data.force_new) {
      return this.getStockTakeSession(tenantId, open.rows[0].id);
    }

    const sessionNumber = `ST-${Date.now().toString(36).toUpperCase()}`;
    const session = await db.query(
      `INSERT INTO stock_take_sessions (tenant_id, branch_id, session_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, data.branch_id || null, sessionNumber, data.notes || null, userId]
    );
    return this.getStockTakeSession(tenantId, session.rows[0].id);
  }

  async listStockTakeSessions(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const count = await db.query(
      'SELECT COUNT(*)::int AS total FROM stock_take_sessions WHERE tenant_id = $1',
      [tenantId]
    );
    const rows = await db.query(
      `SELECT sts.*, b.name AS branch_name,
              (SELECT COUNT(*)::int FROM stock_take_lines WHERE session_id = sts.id) AS line_count
       FROM stock_take_sessions sts
       LEFT JOIN branches b ON b.id = sts.branch_id
       WHERE sts.tenant_id = $1
       ORDER BY sts.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getStockTakeSession(tenantId, sessionId) {
    const session = await db.query(
      `SELECT sts.*, b.name AS branch_name
       FROM stock_take_sessions sts
       LEFT JOIN branches b ON b.id = sts.branch_id
       WHERE sts.id = $1 AND sts.tenant_id = $2`,
      [sessionId, tenantId]
    );
    if (!session.rows[0]) throw new NotFoundError('Stock take session not found');

    const lines = await db.query(
      `SELECT stl.*, p.name AS product_name, p.sku
       FROM stock_take_lines stl
       JOIN products p ON p.id = stl.product_id
       WHERE stl.session_id = $1 AND stl.tenant_id = $2
       ORDER BY p.name`,
      [sessionId, tenantId]
    );

    return { ...session.rows[0], lines: lines.rows };
  }

  async getOpenStockTakeSession(tenantId) {
    const result = await db.query(
      `SELECT id FROM stock_take_sessions WHERE tenant_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    if (!result.rows[0]) return null;
    return this.getStockTakeSession(tenantId, result.rows[0].id);
  }

  async addStockTakeLine(tenantId, sessionId, data) {
    const session = await db.query(
      'SELECT status, branch_id FROM stock_take_sessions WHERE id = $1 AND tenant_id = $2',
      [sessionId, tenantId]
    );
    if (!session.rows[0]) throw new NotFoundError('Stock take session not found');
    if (session.rows[0].status !== 'open') throw new ValidationError('Stock take session is not open');

    const qty = parseInt(data.counted_qty, 10);
    if (!Number.isFinite(qty) || qty < 0) throw new ValidationError('Counted quantity must be 0 or greater');

    const product = await db.query(
      'SELECT stock_quantity, name FROM products WHERE id = $1 AND tenant_id = $2',
      [data.product_id, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');
    const branchId = await branchStockService.resolveBranchId(tenantId, session.rows[0].branch_id);
    const expected = await branchStockService.getQuantity(
      tenantId, branchId, data.product_id, data.variant_id || null
    );
    const existing = await db.query(
      `SELECT id FROM stock_take_lines
       WHERE session_id = $1 AND product_id = $2 AND tenant_id = $3
         AND (
           ($4::uuid IS NULL AND variant_id IS NULL)
           OR variant_id = $4::uuid
         )`,
      [sessionId, data.product_id, tenantId, data.variant_id || null]
    );
    if (existing.rows[0]) {
      const result = await db.query(
        `UPDATE stock_take_lines SET counted_qty = $1, expected_qty = $2 WHERE id = $3 RETURNING *`,
        [qty, expected, existing.rows[0].id]
      );
      return { ...result.rows[0], product_name: product.rows[0].name };
    }
    const result = await db.query(
      `INSERT INTO stock_take_lines (tenant_id, session_id, product_id, variant_id, expected_qty, counted_qty)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, sessionId, data.product_id, data.variant_id || null, expected, qty]
    );
    const line = result.rows[0];
    return { ...line, product_name: product.rows[0].name };
  }

  async completeStockTake(tenantId, sessionId, userId) {
    const session = await this.getStockTakeSession(tenantId, sessionId);
    if (session.status !== 'open') throw new ValidationError('Stock take session is not open');
    if (!session.lines?.length) throw new ValidationError('Count at least one product before completing');

    const branchId = await branchStockService.resolveBranchId(tenantId, session.branch_id);
    for (const line of session.lines) {
      const currentQty = await branchStockService.getQuantity(
        tenantId, branchId, line.product_id, line.variant_id || null
      );
      const delta = line.counted_qty - currentQty;
      if (delta === 0) continue;
      await branchStockService.adjust(tenantId, {
        branch_id: branchId,
        product_id: line.product_id,
        variant_id: line.variant_id || null,
        quantity: Math.abs(delta),
        reference_type: 'stock_take',
        reference_id: sessionId,
        notes: `Stock take ${session.session_number || sessionId}`,
        allowNegative: true,
      }, delta > 0 ? 'adjustment' : 'stock_out', userId);
    }
    await db.query(
      `UPDATE stock_take_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId]
    );
    return this.getStockTakeSession(tenantId, sessionId);
  }

  async cancelStockTake(tenantId, sessionId) {
    const session = await db.query(
      'SELECT status FROM stock_take_sessions WHERE id = $1 AND tenant_id = $2',
      [sessionId, tenantId]
    );
    if (!session.rows[0]) throw new NotFoundError('Stock take session not found');
    if (session.rows[0].status !== 'open') throw new ValidationError('Only open sessions can be cancelled');

    await db.query('DELETE FROM stock_take_lines WHERE session_id = $1 AND tenant_id = $2', [sessionId, tenantId]);
    await db.query(
      `UPDATE stock_take_sessions SET status = 'cancelled', completed_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId]
    );
    return { id: sessionId, status: 'cancelled' };
  }

  async _adjustStock(tenantId, data, type, userId, deduct = false) {
    if (!data.product_id) throw new ValidationError('product_id is required');
    const qty = Math.abs(parseInt(data.quantity, 10) || 0);
    if (!qty) throw new ValidationError('quantity must be greater than 0');

    const product = await db.query(
      'SELECT id, name, low_stock_threshold FROM products WHERE id = $1 AND tenant_id = $2',
      [data.product_id, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');

    const branchId = await branchStockService.resolveBranchId(tenantId, data.branch_id);
    // Keep transaction_type='adjustment' for signed adjustments; use stock_out only for explicit stock-out API.
    const adjustType = (deduct && type !== 'adjustment') ? 'stock_out' : type;
    await branchStockService.adjust(tenantId, {
      branch_id: branchId,
      product_id: data.product_id,
      variant_id: data.variant_id || null,
      quantity: qty,
      deduct: deduct || data.deduct === true,
      notes: data.notes || null,
      reference_type: data.reference_type || 'manual',
      reference_id: data.reference_id || null,
      allowNegative: data.allowNegative === true,
    }, adjustType, userId);

    const newQty = await branchStockService.getQuantity(
      tenantId, branchId, data.product_id, data.variant_id || null
    );

    const threshold = product.rows[0].low_stock_threshold ?? 10;
    if (newQty <= threshold) {
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
          await emailService.send({
            to: tenant.rows[0]?.email,
            subject: `Low Stock Alert: ${product.rows[0].name}`,
            html: `<p>Product <strong>${product.rows[0].name}</strong> is low on stock (${newQty} remaining).</p>`,
            tenantId,
            template: 'low_stock',
          });
        } catch (_) { /* non-blocking */ }
      });
    }

    return {
      product_id: data.product_id,
      variant_id: data.variant_id || null,
      branch_id: branchId,
      transaction_type: adjustType,
      quantity: deduct ? -qty : qty,
      new_quantity: newQty,
    };
  }
}

module.exports = new InventoryService();
