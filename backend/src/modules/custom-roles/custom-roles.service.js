const db = require('../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');

class CustomRolesService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT * FROM custom_roles WHERE tenant_id = $1 ORDER BY name`,
      [tenantId]
    );
    return result.rows;
  }

  async create(tenantId, data) {
    const name = String(data.name || '').trim();
    if (!name) throw new ValidationError('name is required');
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];
    try {
      const result = await db.query(
        `INSERT INTO custom_roles (tenant_id, name, permissions) VALUES ($1, $2, $3::jsonb) RETURNING *`,
        [tenantId, name, JSON.stringify(permissions)]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ConflictError('Role name already exists');
      throw err;
    }
  }

  async update(tenantId, id, data) {
    const existing = await db.query(
      `SELECT * FROM custom_roles WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundError('Custom role not found');
    const name = data.name != null ? String(data.name).trim() : existing.rows[0].name;
    const permissions = data.permissions != null ? data.permissions : existing.rows[0].permissions;
    const result = await db.query(
      `UPDATE custom_roles SET name = $1, permissions = $2::jsonb WHERE id = $3 AND tenant_id = $4 RETURNING *`,
      [name, JSON.stringify(permissions), id, tenantId]
    );
    return result.rows[0];
  }

  async assignToUser(tenantId, roleId, userId) {
    const role = await db.query(
      `SELECT id FROM custom_roles WHERE id = $1 AND tenant_id = $2`,
      [roleId, tenantId]
    );
    if (!role.rows[0]) throw new NotFoundError('Custom role not found');
    const user = await db.query(
      `SELECT id FROM users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    if (!user.rows[0]) throw new NotFoundError('User not found');
    await db.query(
      `UPDATE users SET custom_role_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [roleId, userId, tenantId]
    );
    return { user_id: userId, custom_role_id: roleId };
  }

  async unassignFromUser(tenantId, userId) {
    const user = await db.query(
      `SELECT id FROM users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    if (!user.rows[0]) throw new NotFoundError('User not found');
    await db.query(
      `UPDATE users SET custom_role_id = NULL, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    return { user_id: userId, custom_role_id: null };
  }
}

module.exports = new CustomRolesService();
