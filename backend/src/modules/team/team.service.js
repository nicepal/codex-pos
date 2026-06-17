const db = require('../../config/database');
const { hashPassword } = require('../../utils/password');
const { ConflictError, NotFoundError, ValidationError } = require('../../shared/errors');
const { checkLimit } = require('../../shared/plan-limits');

class TeamService {
  async _getUserRole(tenantId, userId) {
    const result = await db.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND ur.tenant_id = $2
       LIMIT 1`,
      [userId, tenantId]
    );
    return result.rows[0]?.name || null;
  }

  async list(tenantId) {
    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.last_login_at, u.created_at,
              r.name AS role_name, r.display_name AS role_display
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = $1
         AND u.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM user_roles ur2
           JOIN roles r2 ON r2.id = ur2.role_id
           WHERE ur2.user_id = u.id AND ur2.tenant_id = u.tenant_id AND r2.name = 'business_owner'
         )
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

    const employeeName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email;
    await db.query(
      `INSERT INTO employees (tenant_id, user_id, name, email, phone, position, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [tenantId, user.id, employeeName, data.email.toLowerCase(), data.phone || null, roleName]
    );

    return { ...user, role: roleName, temp_password: data.password ? undefined : tempPassword };
  }

  async updateRole(tenantId, userId, roleName) {
    const currentRole = await this._getUserRole(tenantId, userId);
    if (currentRole === 'business_owner') {
      throw new ValidationError('Cannot change the business owner role');
    }

    const user = await db.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    if (!user.rows[0]) throw new NotFoundError('User not found');

    const role = await db.query('SELECT id FROM roles WHERE name = $1 AND is_platform_role = false', [roleName]);
    if (!role.rows[0]) throw new ValidationError('Invalid role');

    await db.query('DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
    await db.query('INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)', [userId, role.rows[0].id, tenantId]);
    await db.query(
      `UPDATE employees SET position = $1 WHERE user_id = $2 AND tenant_id = $3`,
      [roleName, userId, tenantId]
    );
    return { user_id: userId, role: roleName };
  }

  async remove(tenantId, userId) {
    const currentRole = await this._getUserRole(tenantId, userId);
    if (currentRole === 'business_owner') {
      throw new ValidationError('Cannot remove the business owner account');
    }

    const user = await db.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    if (!user.rows[0]) throw new NotFoundError('User not found');

    await db.query(`UPDATE users SET status = 'inactive' WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await db.query(
      `UPDATE employees SET status = 'inactive' WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    return true;
  }

  async bulkRemove(tenantId, ids) {
    const { bulkRemoveByIds } = require('../../shared/bulk-delete');
    return bulkRemoveByIds((tid, itemId) => this.remove(tid, itemId), tenantId, ids);
  }
}

module.exports = new TeamService();
