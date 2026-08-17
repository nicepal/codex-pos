const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

class ShiftsService {
  async clockIn(tenantId, { employee_id: employeeId, branch_id: branchId, drawer_session_id: drawerSessionId }, userId) {
    if (!employeeId) throw new ValidationError('employee_id is required');
    const open = await db.query(
      `SELECT id FROM shifts WHERE tenant_id = $1 AND employee_id = $2 AND (status = 'open' OR (status IS NULL AND ended_at IS NULL AND clock_out IS NULL)) LIMIT 1`,
      [tenantId, employeeId]
    );
    if (open.rows[0]) throw new ValidationError('Employee already has an open shift');

    if (drawerSessionId) {
      const drawer = await db.query(
        `SELECT id FROM cash_drawer_sessions WHERE id = $1 AND tenant_id = $2 AND status = 'open'`,
        [drawerSessionId, tenantId]
      );
      if (!drawer.rows[0]) throw new ValidationError('Open drawer session not found');
    }

    const result = await db.query(
      `INSERT INTO shifts (tenant_id, employee_id, branch_id, drawer_session_id, started_at, clock_in, status, created_by)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 'open', $5) RETURNING *`,
      [tenantId, employeeId, branchId || null, drawerSessionId || null, userId || null]
    );
    return result.rows[0];
  }

  async clockOut(tenantId, shiftId, { notes } = {}) {
    const shift = await db.query(
      `SELECT * FROM shifts WHERE id = $1 AND tenant_id = $2`,
      [shiftId, tenantId]
    );
    if (!shift.rows[0]) throw new NotFoundError('Shift not found');
    const s = shift.rows[0];
    if (s.status === 'closed' || s.ended_at || s.clock_out) {
      throw new ValidationError('Shift is not open');
    }

    const result = await db.query(
      `UPDATE shifts
       SET ended_at = NOW(), clock_out = NOW(), status = 'closed', notes = COALESCE($3, notes)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [shiftId, tenantId, notes || null]
    );
    return result.rows[0];
  }

  async current(tenantId, employeeId) {
    if (!employeeId) return null;
    const result = await db.query(
      `SELECT s.*, e.name AS employee_name
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       WHERE s.tenant_id = $1 AND s.employee_id = $2
         AND (s.status = 'open' OR (s.ended_at IS NULL AND s.clock_out IS NULL))
       ORDER BY COALESCE(s.clock_in, s.started_at) DESC LIMIT 1`,
      [tenantId, employeeId]
    );
    return result.rows[0] || null;
  }

  /** Open shift at branch (or default branch when branchId is null). */
  async findOpenAtBranch(tenantId, branchId) {
    const params = [tenantId];
    let branchClause = ' AND s.branch_id IS NULL';
    if (branchId) {
      params.push(branchId);
      branchClause = ` AND s.branch_id IS NOT DISTINCT FROM $${params.length}`;
    }
    const result = await db.query(
      `SELECT s.* FROM shifts s
       WHERE s.tenant_id = $1
         AND (s.status = 'open' OR (s.ended_at IS NULL AND s.clock_out IS NULL))
         ${branchClause}
       ORDER BY COALESCE(s.clock_in, s.started_at) DESC LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async list(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let where = 's.tenant_id = $1';
    if (query.employee_id) {
      params.push(query.employee_id);
      where += ` AND s.employee_id = $${params.length}`;
    }
    if (query.status) {
      params.push(query.status);
      where += ` AND s.status = $${params.length}`;
    }
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM shifts s WHERE ${where}`, params);
    params.push(limit, offset);
    const rows = await db.query(
      `SELECT s.*, e.name AS employee_name, b.name AS branch_name
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       LEFT JOIN branches b ON b.id = s.branch_id
       WHERE ${where}
       ORDER BY COALESCE(s.clock_in, s.started_at) DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async shiftReport(tenantId, shiftId, { closing = false } = {}) {
    const shift = await db.query(
      `SELECT s.*, e.name AS employee_name
       FROM shifts s
       LEFT JOIN employees e ON e.id = s.employee_id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [shiftId, tenantId]
    );
    if (!shift.rows[0]) throw new NotFoundError('Shift not found');
    const s = shift.rows[0];
    const start = s.clock_in || s.started_at;
    const end = closing ? new Date() : (s.clock_out || s.ended_at);

    // Register-oriented: POS sales in this shift's branch during the open window.
    const sales = await db.query(
      `SELECT
         COUNT(*)::int AS order_count,
         COALESCE(SUM(total_amount), 0)::numeric AS gross_sales,
         COALESCE(SUM(tax_amount), 0)::numeric AS tax_total,
         COALESCE(SUM(discount_amount), 0)::numeric AS discount_total,
         COALESCE(SUM(tip_amount), 0)::numeric AS tip_total
       FROM orders
       WHERE tenant_id = $1
         AND ($2::uuid IS NULL OR branch_id IS NOT DISTINCT FROM $2)
         AND status IN ('paid', 'completed', 'refunded')
         AND COALESCE(order_type, 'pos') = 'pos'
         AND created_at >= $3
         AND created_at <= COALESCE($4, NOW())`,
      [tenantId, s.branch_id, start, end]
    );

    const mix = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0)::numeric AS cash_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0)::numeric AS card_sales,
         COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash', 'card') THEN amount ELSE 0 END), 0)::numeric AS other_sales
       FROM (
         SELECT op.payment_method, op.amount
         FROM order_payments op
         JOIN orders o ON o.id = op.order_id
         WHERE o.tenant_id = $1
           AND ($2::uuid IS NULL OR o.branch_id IS NOT DISTINCT FROM $2)
           AND o.status IN ('paid', 'completed', 'refunded')
           AND COALESCE(o.order_type, 'pos') = 'pos'
           AND o.created_at >= $3
           AND o.created_at <= COALESCE($4, NOW())
         UNION ALL
         SELECT o.payment_method, o.total_amount AS amount
         FROM orders o
         WHERE o.tenant_id = $1
           AND ($2::uuid IS NULL OR o.branch_id IS NOT DISTINCT FROM $2)
           AND o.status IN ('paid', 'completed', 'refunded')
           AND COALESCE(o.order_type, 'pos') = 'pos'
           AND o.created_at >= $3
           AND o.created_at <= COALESCE($4, NOW())
           AND NOT EXISTS (SELECT 1 FROM order_payments op WHERE op.order_id = o.id)
       ) t`,
      [tenantId, s.branch_id, start, end]
    );

    const base = sales.rows[0] || {};
    const tender = mix.rows[0] || {};
    return {
      shift: s,
      report_type: closing || (s.status === 'closed' || s.clock_out || s.ended_at) ? 'Z' : 'X',
      report: {
        order_count: base.order_count || 0,
        gross_sales: base.gross_sales || 0,
        tax_total: base.tax_total || 0,
        discount_total: base.discount_total || 0,
        tip_total: base.tip_total || 0,
        cash_sales: tender.cash_sales || 0,
        card_sales: tender.card_sales || 0,
        other_sales: tender.other_sales || 0,
      },
    };
  }

  async zReport(tenantId, shiftId) {
    return this.shiftReport(tenantId, shiftId, { closing: true });
  }

  async xReport(tenantId, shiftId) {
    return this.shiftReport(tenantId, shiftId, { closing: false });
  }
}

module.exports = new ShiftsService();
