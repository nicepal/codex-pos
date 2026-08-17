const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

class DrawerService {
  async listOpen(tenantId, { branch_id: branchId } = {}) {
    const params = [tenantId];
    let branchClause = '';
    if (branchId) {
      params.push(branchId);
      branchClause = ` AND cds.branch_id IS NOT DISTINCT FROM $${params.length}`;
    }
    const result = await db.query(
      `SELECT cds.*, e.name AS employee_name, b.name AS branch_name
       FROM cash_drawer_sessions cds
       LEFT JOIN employees e ON e.id = cds.employee_id
       LEFT JOIN branches b ON b.id = cds.branch_id
       WHERE cds.tenant_id = $1 AND cds.status = 'open'${branchClause}
       ORDER BY cds.opened_at DESC`,
      params
    );
    return result.rows;
  }

  async getById(tenantId, id) {
    const result = await db.query(
      `SELECT cds.*, e.name AS employee_name, b.name AS branch_name
       FROM cash_drawer_sessions cds
       LEFT JOIN employees e ON e.id = cds.employee_id
       LEFT JOIN branches b ON b.id = cds.branch_id
       WHERE cds.id = $1 AND cds.tenant_id = $2`,
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Drawer session not found');
    return result.rows[0];
  }

  async open(tenantId, data, userId) {
    const branchId = data.branch_id || null;
    const existing = await db.query(
      `SELECT id FROM cash_drawer_sessions
       WHERE tenant_id = $1 AND branch_id IS NOT DISTINCT FROM $2 AND status = 'open'`,
      [tenantId, branchId]
    );
    if (existing.rows[0]) throw new ValidationError('Drawer already open for this branch');

    const result = await db.query(
      `INSERT INTO cash_drawer_sessions (tenant_id, branch_id, employee_id, opened_by, opening_float, status)
       VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
      [tenantId, branchId, data.employee_id || null, userId, data.opening_float || 0]
    );
    return result.rows[0];
  }

  /**
   * Expected cash = opening + cash sales + cash_in − cash refunds − cash_out
   */
  async computeExpected(tenantId, session) {
    const s = session;
    const openingFloat = parseFloat(s.opening_float) || 0;

    const cashSalesResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS cash_sales FROM (
         SELECT op.amount
         FROM order_payments op
         JOIN orders o ON o.id = op.order_id
         WHERE o.tenant_id = $1
           AND op.payment_method = 'cash'
           AND o.status IN ('paid', 'completed', 'refunded')
           AND o.created_at >= $2
           AND ($3::uuid IS NULL OR o.branch_id IS NOT DISTINCT FROM $3)
         UNION ALL
         SELECT o.total_amount AS amount
         FROM orders o
         WHERE o.tenant_id = $1
           AND o.payment_method = 'cash'
           AND o.status IN ('paid', 'completed', 'refunded')
           AND o.created_at >= $2
           AND ($3::uuid IS NULL OR o.branch_id IS NOT DISTINCT FROM $3)
           AND NOT EXISTS (SELECT 1 FROM order_payments op WHERE op.order_id = o.id)
       ) t`,
      [tenantId, s.opened_at, s.branch_id]
    );
    const cashSales = parseFloat(cashSalesResult.rows[0]?.cash_sales) || 0;

    const cashRefundsResult = await db.query(
      `SELECT COALESCE(SUM(r.total_refund), 0)::numeric AS cash_refunds
       FROM order_returns r
       JOIN orders o ON o.id = r.order_id
       WHERE r.tenant_id = $1
         AND r.created_at >= $2
         AND ($3::uuid IS NULL OR o.branch_id IS NOT DISTINCT FROM $3)
         AND (o.payment_method = 'cash' OR EXISTS (
           SELECT 1 FROM order_payments op WHERE op.order_id = o.id AND op.payment_method = 'cash'
         ))`,
      [tenantId, s.opened_at, s.branch_id]
    );
    const cashRefunds = parseFloat(cashRefundsResult.rows[0]?.cash_refunds) || 0;

    const movementsResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN movement_type = 'cash_in' THEN amount ELSE 0 END), 0)::numeric AS cash_in,
         COALESCE(SUM(CASE WHEN movement_type = 'cash_out' THEN amount ELSE 0 END), 0)::numeric AS cash_out
       FROM cash_drawer_movements
       WHERE tenant_id = $1 AND session_id = $2`,
      [tenantId, s.id]
    );
    const cashIn = parseFloat(movementsResult.rows[0]?.cash_in) || 0;
    const cashOut = parseFloat(movementsResult.rows[0]?.cash_out) || 0;

    const expected = roundMoney(openingFloat + cashSales + cashIn - cashRefunds - cashOut);

    return {
      opening_float: openingFloat,
      cash_sales: roundMoney(cashSales),
      cash_in: roundMoney(cashIn),
      cash_refunds: roundMoney(cashRefunds),
      cash_out: roundMoney(cashOut),
      expected_cash: expected,
    };
  }

  async summary(tenantId, id) {
    const session = await this.getById(tenantId, id);
    if (session.status !== 'open') throw new ValidationError('Drawer session is closed');
    const expected = await this.computeExpected(tenantId, session);
    const movements = await db.query(
      `SELECT m.*, u.email AS created_by_email
       FROM cash_drawer_movements m
       LEFT JOIN users u ON u.id = m.created_by
       WHERE m.tenant_id = $1 AND m.session_id = $2
       ORDER BY m.created_at DESC
       LIMIT 100`,
      [tenantId, id]
    );
    return { session, ...expected, movements: movements.rows };
  }

  async addMovement(tenantId, sessionId, data, userId) {
    const session = await this.getById(tenantId, sessionId);
    if (session.status !== 'open') throw new ValidationError('Drawer session is closed');

    const type = data.movement_type || data.type;
    if (!['cash_in', 'cash_out'].includes(type)) {
      throw new ValidationError('movement_type must be cash_in or cash_out');
    }
    const amount = parseFloat(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('amount must be a positive number');
    }

    const result = await db.query(
      `INSERT INTO cash_drawer_movements (tenant_id, session_id, movement_type, amount, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, sessionId, type, roundMoney(amount), data.note || null, userId || null]
    );
    const summary = await this.summary(tenantId, sessionId);
    return { movement: result.rows[0], summary };
  }

  async close(tenantId, id, data, userId) {
    const session = await this.getById(tenantId, id);
    if (session.status === 'closed') throw new ValidationError('Drawer already closed');

    const closingCash = parseFloat(data.closing_cash);
    if (!Number.isFinite(closingCash) || closingCash < 0) {
      throw new ValidationError('closing_cash is required');
    }

    const expected = await this.computeExpected(tenantId, session);
    const variance = roundMoney(closingCash - expected.expected_cash);

    const result = await db.query(
      `UPDATE cash_drawer_sessions SET status = 'closed', closed_by = $1, closing_cash = $2,
       expected_cash = $3, variance = $4, closed_at = NOW() WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [userId, closingCash, expected.expected_cash, variance, id, tenantId]
    );
    return { ...result.rows[0], breakdown: expected };
  }
}

module.exports = new DrawerService();
