const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

class ModifiersService {
  async _getGroup(tenantId, id) {
    const result = await db.query(
      'SELECT * FROM modifier_groups WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Modifier group not found');
    return result.rows[0];
  }

  async _getOption(tenantId, id) {
    const result = await db.query(
      `SELECT mo.*, mg.name AS group_name
       FROM modifier_options mo
       JOIN modifier_groups mg ON mg.id = mo.modifier_group_id AND mg.tenant_id = mo.tenant_id
       WHERE mo.id = $1 AND mo.tenant_id = $2`,
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Modifier option not found');
    return result.rows[0];
  }

  async listGroups(tenantId, { active } = {}) {
    const params = [tenantId];
    let where = 'tenant_id = $1';
    if (active === true || active === 'true') {
      where += ' AND active = true';
    }
    const result = await db.query(
      `SELECT * FROM modifier_groups WHERE ${where} ORDER BY name ASC`,
      params
    );
    return result.rows;
  }

  async getGroupWithOptions(tenantId, id) {
    const group = await this._getGroup(tenantId, id);
    const options = await db.query(
      `SELECT * FROM modifier_options
       WHERE tenant_id = $1 AND modifier_group_id = $2
       ORDER BY display_order ASC, name ASC`,
      [tenantId, id]
    );
    return { ...group, options: options.rows };
  }

  async createGroup(tenantId, data) {
    const minSel = data.min_selections ?? (data.required ? 1 : 0);
    const maxSel = data.max_selections ?? 1;
    if (maxSel < minSel) throw new ValidationError('max_selections must be >= min_selections');
    const result = await db.query(
      `INSERT INTO modifier_groups (tenant_id, name, required, min_selections, max_selections, active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, data.name, data.required === true, minSel, maxSel, data.active !== false]
    );
    return result.rows[0];
  }

  async updateGroup(tenantId, id, data) {
    const current = await this._getGroup(tenantId, id);
    const minSel = data.min_selections != null ? data.min_selections : current.min_selections;
    const maxSel = data.max_selections != null ? data.max_selections : current.max_selections;
    if (maxSel < minSel) throw new ValidationError('max_selections must be >= min_selections');
    const result = await db.query(
      `UPDATE modifier_groups
       SET name = COALESCE($3, name),
           required = COALESCE($4, required),
           min_selections = COALESCE($5, min_selections),
           max_selections = COALESCE($6, max_selections),
           active = COALESCE($7, active)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id, tenantId, data.name || null,
        data.required != null ? data.required : null,
        data.min_selections != null ? data.min_selections : null,
        data.max_selections != null ? data.max_selections : null,
        data.active != null ? data.active : null,
      ]
    );
    return result.rows[0];
  }

  async deleteGroup(tenantId, id) {
    await this._getGroup(tenantId, id);
    await db.query('DELETE FROM modifier_groups WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return { deleted: true };
  }

  async createOption(tenantId, groupId, data) {
    await this._getGroup(tenantId, groupId);
    const result = await db.query(
      `INSERT INTO modifier_options
         (tenant_id, modifier_group_id, name, price_delta, display_order, active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        tenantId, groupId, data.name,
        data.price_delta ?? 0,
        data.display_order ?? 0,
        data.active !== false,
      ]
    );
    return result.rows[0];
  }

  async updateOption(tenantId, id, data) {
    await this._getOption(tenantId, id);
    const result = await db.query(
      `UPDATE modifier_options
       SET name = COALESCE($3, name),
           price_delta = COALESCE($4, price_delta),
           display_order = COALESCE($5, display_order),
           active = COALESCE($6, active)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id, tenantId, data.name || null,
        data.price_delta != null ? data.price_delta : null,
        data.display_order != null ? data.display_order : null,
        data.active != null ? data.active : null,
      ]
    );
    return result.rows[0];
  }

  async deleteOption(tenantId, id) {
    await this._getOption(tenantId, id);
    await db.query('DELETE FROM modifier_options WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return { deleted: true };
  }

  async getProductModifiers(tenantId, productId) {
    const product = await db.query(
      'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
      [productId, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');

    const groups = await db.query(
      `SELECT mg.*, pmg.sort_order AS product_sort_order
       FROM product_modifier_groups pmg
       JOIN modifier_groups mg ON mg.id = pmg.modifier_group_id AND mg.tenant_id = pmg.tenant_id
       WHERE pmg.tenant_id = $1 AND pmg.product_id = $2 AND mg.active = true
       ORDER BY pmg.sort_order ASC, mg.name ASC`,
      [tenantId, productId]
    );

    if (!groups.rows.length) return [];

    const groupIds = groups.rows.map((g) => g.id);
    const options = await db.query(
      `SELECT * FROM modifier_options
       WHERE tenant_id = $1 AND modifier_group_id = ANY($2::uuid[]) AND active = true
       ORDER BY display_order ASC, name ASC`,
      [tenantId, groupIds]
    );

    const byGroup = {};
    for (const opt of options.rows) {
      if (!byGroup[opt.modifier_group_id]) byGroup[opt.modifier_group_id] = [];
      byGroup[opt.modifier_group_id].push(opt);
    }

    return groups.rows.map((g) => ({
      ...g,
      options: byGroup[g.id] || [],
    }));
  }

  async setProductModifiers(tenantId, productId, groupIds = []) {
    const product = await db.query(
      'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
      [productId, tenantId]
    );
    if (!product.rows[0]) throw new NotFoundError('Product not found');

    const uniqueIds = [...new Set(groupIds.filter(Boolean))];
    for (const gid of uniqueIds) {
      await this._getGroup(tenantId, gid);
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM product_modifier_groups WHERE tenant_id = $1 AND product_id = $2',
        [tenantId, productId]
      );
      for (let i = 0; i < uniqueIds.length; i += 1) {
        await client.query(
          `INSERT INTO product_modifier_groups (tenant_id, product_id, modifier_group_id, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [tenantId, productId, uniqueIds[i], i]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getProductModifiers(tenantId, productId);
  }
}

module.exports = new ModifiersService();
