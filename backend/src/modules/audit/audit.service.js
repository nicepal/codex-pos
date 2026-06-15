const db = require('../../config/database');
const { paginate, paginationMeta } = require('../../utils/helpers');

class AuditService {
  async list(query = {}) {
    const { page, limit, offset } = { ...paginate(query.page, query.limit) };
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (query.tenant_id) {
      conditions.push(`a.tenant_id = $${idx++}`);
      params.push(query.tenant_id);
    }
    if (query.action) {
      conditions.push(`a.action ILIKE $${idx++}`);
      params.push(`%${query.action}%`);
    }
    if (query.entity_type) {
      conditions.push(`a.entity_type = $${idx++}`);
      params.push(query.entity_type);
    }

    const where = conditions.join(' AND ');
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM audit_logs a WHERE ${where}`, params);
    const result = await db.query(
      `SELECT a.*, u.email AS user_email, u.first_name, u.last_name, t.name AS tenant_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN tenants t ON t.id = a.tenant_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return { rows: result.rows, pagination: paginationMeta(count.rows[0].total, page, limit) };
  }
}

module.exports = new AuditService();
