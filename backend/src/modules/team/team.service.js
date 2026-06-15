const db = require('../../config/database');
const { hashPassword } = require('../../utils/password');
const { ConflictError, NotFoundError, ValidationError } = require('../../shared/errors');
const { checkLimit } = require('../../shared/plan-limits');

class TeamService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.last_login_at, u.created_at,
              r.name AS role_name, r.display_name AS role_display
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = $1
       ORDER BY u.created_at`,
      [tenantId]
    );
    return result.rows;
  }

  async invite(tenantId, data, invitedBy) {
    await checkLimit(tenantId, 'users');

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rows[0]) throw new ConflictError('Email already registered');

    const roleName = data.role || 'cashier';
    const role = await db.query('SELECT id FROM roles WHERE name = $1 AND is_platform_role = false', [roleName]);
    if (!role.rows[0]) throw new ValidationError('Invalid role');

    const tempPassword = data.password || `Temp@${Math.random().toString(36).slice(2, 10)}`;
    const passwordHash = await hashPassword(tempPassword);

    const userResult = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id, email, first_name, last_name, phone, status`,
      [tenantId, data.email.toLowerCase(), passwordHash, data.first_name, data.last_name, data.phone]
    );
    const user = userResult.rows[0];

    await db.query(
      'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)',
      [user.id, role.rows[0].id, tenantId]
    );

    return { ...user, role: roleName, temp_password: data.password ? undefined : tempPassword };
  }

  async updateRole(tenantId, userId, roleName) {
    const user = await db.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    if (!user.rows[0]) throw new NotFoundError('User not found');

    const role = await db.query('SELECT id FROM roles WHERE name = $1 AND is_platform_role = false', [roleName]);
    if (!role.rows[0]) throw new ValidationError('Invalid role');

    await db.query('DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
    await db.query('INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)', [userId, role.rows[0].id, tenantId]);
    return { user_id: userId, role: roleName };
  }

  async remove(tenantId, userId) {
    const user = await db.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    if (!user.rows[0]) throw new NotFoundError('User not found');
    await db.query(`UPDATE users SET status = 'inactive' WHERE id = $1`, [userId]);
    return true;
  }

  async bulkRemove(tenantId, ids) {
    const { bulkRemoveByIds } = require('../../shared/bulk-delete');
    return bulkRemoveByIds((tid, itemId) => this.remove(tid, itemId), tenantId, ids);
  }
}

module.exports = new TeamService();
