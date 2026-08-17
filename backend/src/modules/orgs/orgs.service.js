const db = require('../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');

class OrgsService {
  async list() {
    const result = await db.query(
      `SELECT o.*,
              (SELECT COUNT(*)::int FROM org_tenants ot WHERE ot.org_id = o.id) AS tenant_count
       FROM orgs o ORDER BY o.created_at DESC`
    );
    return result.rows;
  }

  async create(data) {
    const name = String(data.name || '').trim();
    const slug = String(data.slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!name || !slug) throw new ValidationError('name and slug are required');
    try {
      const result = await db.query(
        `INSERT INTO orgs (name, slug, white_label) VALUES ($1, $2, $3::jsonb) RETURNING *`,
        [name, slug, JSON.stringify(data.white_label || {})]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ConflictError('Org slug already exists');
      throw err;
    }
  }

  async attachTenant(orgId, tenantId, role = 'franchisee') {
    const org = await db.query('SELECT id FROM orgs WHERE id = $1', [orgId]);
    if (!org.rows[0]) throw new NotFoundError('Org not found');
    const tenant = await db.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant.rows[0]) throw new NotFoundError('Tenant not found');
    await db.query(
      `INSERT INTO org_tenants (org_id, tenant_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (org_id, tenant_id) DO UPDATE SET role = EXCLUDED.role`,
      [orgId, tenantId, role]
    );
    await db.query('UPDATE tenants SET org_id = $1 WHERE id = $2', [orgId, tenantId]);
    return { org_id: orgId, tenant_id: tenantId, role };
  }

  async listTenants(orgId) {
    const result = await db.query(
      `SELECT t.id, t.name, t.slug, t.status, ot.role
       FROM org_tenants ot
       JOIN tenants t ON t.id = ot.tenant_id
       WHERE ot.org_id = $1
       ORDER BY t.name`,
      [orgId]
    );
    return result.rows;
  }

  async rollup(orgId) {
    const result = await db.query(
      `SELECT
         COUNT(DISTINCT o.id)::int AS order_count,
         COALESCE(SUM(o.total_amount), 0)::numeric AS gross_sales,
         COUNT(DISTINCT o.tenant_id)::int AS active_locations
       FROM orders o
       JOIN org_tenants ot ON ot.tenant_id = o.tenant_id
       WHERE ot.org_id = $1 AND o.created_at >= NOW() - INTERVAL '30 days'
         AND o.status IN ('paid', 'completed')`,
      [orgId]
    );
    return result.rows[0];
  }
}

module.exports = new OrgsService();
