const db = require('../../config/database');
const crypto = require('crypto');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');

class DomainsService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT * FROM tenant_domains WHERE tenant_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async addCustom(tenantId, domain) {
    const normalized = String(domain || '').trim().toLowerCase();
    if (!normalized || normalized.includes(' ')) {
      throw new ValidationError('Enter a valid domain (e.g. shop.example.com)');
    }

    const existing = await db.query('SELECT id FROM tenant_domains WHERE domain = $1', [normalized]);
    if (existing.rows[0]) throw new ConflictError('Domain is already registered');

    const token = crypto.randomBytes(16).toString('hex');
    const result = await db.query(
      `INSERT INTO tenant_domains (tenant_id, domain, domain_type, is_primary, verification_status, verification_token)
       VALUES ($1, $2, 'custom', false, 'pending', $3) RETURNING *`,
      [tenantId, normalized, token]
    );
    return result.rows[0];
  }

  async remove(tenantId, id) {
    const row = await db.query(
      'SELECT * FROM tenant_domains WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!row.rows[0]) throw new NotFoundError('Domain not found');
    if (row.rows[0].domain_type === 'subdomain' && row.rows[0].is_primary) {
      throw new ValidationError('Cannot remove the default subdomain');
    }
    await db.query('DELETE FROM tenant_domains WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return { deleted: true };
  }

  async verify(tenantId, id) {
    const row = await db.query(
      'SELECT * FROM tenant_domains WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!row.rows[0]) throw new NotFoundError('Domain not found');
    if (row.rows[0].domain_type !== 'custom') {
      throw new ValidationError('Only custom domains can be verified');
    }
    const result = await db.query(
      `UPDATE tenant_domains SET verification_status = 'verified', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0];
  }
}

module.exports = new DomainsService();
