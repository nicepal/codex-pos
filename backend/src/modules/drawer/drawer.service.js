const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

class DrawerService {
  async listOpen(tenantId) {
    const result = await db.query(
      `SELECT cds.*, e.name AS employee_name, b.name AS branch_name
       FROM cash_drawer_sessions cds
       LEFT JOIN employees e ON e.id = cds.employee_id
       LEFT JOIN branches b ON b.id = cds.branch_id
       WHERE cds.tenant_id = $1 AND cds.status = 'open' ORDER BY cds.opened_at DESC`,
      [tenantId]
    );
    return result.rows;
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

  async close(tenantId, id, data, userId) {
    const session = await db.query(
      'SELECT * FROM cash_drawer_sessions WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!session.rows[0]) throw new NotFoundError('Drawer session not found');
    if (session.rows[0].status === 'closed') throw new ValidationError('Drawer already closed');

    const closingCash = parseFloat(data.closing_cash) || 0;
    const expected = parseFloat(session.rows[0].opening_float) || 0;
    const variance = closingCash - expected;

    const result = await db.query(
      `UPDATE cash_drawer_sessions SET status = 'closed', closed_by = $1, closing_cash = $2,
       expected_cash = $3, variance = $4, closed_at = NOW() WHERE id = $5 RETURNING *`,
      [userId, closingCash, expected, variance, id]
    );
    return result.rows[0];
  }
}

module.exports = new DrawerService();
