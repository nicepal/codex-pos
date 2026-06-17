const crypto = require('crypto');
const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

function hashKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

class ApiKeysService {
  async list(tenantId) {
    const result = await db.query(
      `SELECT id, name, key_prefix, scopes, status, last_used_at, created_at, revoked_at
       FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    // Display a masked representation of the key
    return result.rows.map((k) => ({ ...k, masked_key: `${k.key_prefix}${'•'.repeat(8)}` }));
  }

  async create(tenantId, data, userId) {
    if (!data.name?.trim()) throw new ValidationError('A key name is required');
    const scopes = Array.isArray(data.scopes) && data.scopes.length ? data.scopes : ['read'];

    const secret = crypto.randomBytes(24).toString('hex');
    const rawKey = `eyz_${secret}`;
    const keyPrefix = rawKey.slice(0, 12); // "eyz_" + 8 chars
    const keyHash = hashKey(rawKey);

    const result = await db.query(
      `INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, scopes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, scopes, status, created_at`,
      [tenantId, data.name.trim(), keyPrefix, keyHash, scopes, userId || null]
    );

    // The plaintext key is returned ONCE and never stored
    return { ...result.rows[0], api_key: rawKey };
  }

  async revoke(tenantId, id) {
    const result = await db.query(
      `UPDATE api_keys SET status = 'revoked', revoked_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'active' RETURNING id`,
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('API key not found');
    return { revoked: true };
  }

  /**
   * Verifies a raw API key and returns its record (with tenant). Updates
   * last_used_at asynchronously. Returns null when invalid/revoked.
   */
  async verify(rawKey) {
    if (!rawKey || !rawKey.startsWith('eyz_')) return null;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = hashKey(rawKey);
    const result = await db.query(
      `SELECT ak.*, t.id AS tenant_id, t.status AS tenant_status
       FROM api_keys ak JOIN tenants t ON t.id = ak.tenant_id
       WHERE ak.key_prefix = $1 AND ak.status = 'active'`,
      [keyPrefix]
    );
    const key = result.rows.find((k) => crypto.timingSafeEqual(
      Buffer.from(k.key_hash), Buffer.from(keyHash)
    ));
    if (!key) return null;
    if (['suspended', 'deleted'].includes(key.tenant_status)) return null;

    db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]).catch(() => {});
    return key;
  }
}

module.exports = new ApiKeysService();
