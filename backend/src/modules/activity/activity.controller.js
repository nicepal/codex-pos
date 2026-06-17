const db = require('../../config/database');
const { asyncHandler } = require('../../middleware/errorHandler');
const { paginated } = require('../../shared/response');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const count = await db.query(
      'SELECT COUNT(*)::int AS total FROM audit_logs WHERE tenant_id = $1',
      [req.tenant.id]
    );
    const rows = await db.query(
      `SELECT al.*, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.tenant_id = $1
       ORDER BY al.created_at DESC LIMIT $2 OFFSET $3`,
      [req.tenant.id, limit, offset]
    );
    const total = count.rows[0].total;
    return paginated(res, rows.rows, { total, page, limit, totalPages: Math.ceil(total / limit) });
  }),
};
