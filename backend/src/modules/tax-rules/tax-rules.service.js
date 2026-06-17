const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');

class TaxRulesService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT tr.*, c.name AS category_name FROM tax_rules tr
       LEFT JOIN categories c ON c.id = tr.category_id
       WHERE tr.tenant_id = $1 ORDER BY tr.is_default DESC, tr.name`,
      [tenantId]
    );
    return result.rows;
  }

  async getById(tenantId, id) {
    const result = await db.query(
      'SELECT * FROM tax_rules WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Tax rule not found');
    return result.rows[0];
  }

  async create(tenantId, data) {
    if (data.is_default) {
      await db.query(
        `UPDATE tax_rules SET is_default = false WHERE tenant_id = $1`,
        [tenantId]
      );
    }
    const result = await db.query(
      `INSERT INTO tax_rules (tenant_id, name, category_id, rate, is_inclusive, is_default, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        tenantId, data.name, data.category_id || null, data.rate,
        data.is_inclusive || false, data.is_default || false, data.status || 'active',
      ]
    );
    return result.rows[0];
  }

  async update(tenantId, id, data) {
    await this.getById(tenantId, id);
    if (data.is_default) {
      await db.query(`UPDATE tax_rules SET is_default = false WHERE tenant_id = $1`, [tenantId]);
    }
    const fields = ['name', 'category_id', 'rate', 'is_inclusive', 'is_default', 'status'];
    const updates = {};
    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f];
    }
    const keys = Object.keys(updates);
    if (!keys.length) return this.getById(tenantId, id);
    const setClause = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const result = await db.query(
      `UPDATE tax_rules SET ${setClause}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, ...keys.map((k) => updates[k])]
    );
    return result.rows[0];
  }

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    await db.query('DELETE FROM tax_rules WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return { deleted: true };
  }
}

module.exports = new TaxRulesService();
