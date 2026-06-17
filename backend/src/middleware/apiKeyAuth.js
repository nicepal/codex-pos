const db = require('../config/database');
const apiKeysService = require('../modules/api-keys/api-keys.service');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors');

/**
 * Authenticates a request using a developer API key supplied via the
 * `X-API-Key` header or `Authorization: Bearer eyz_...`. Loads the owning
 * tenant onto req.tenant so existing tenant-scoped services work unchanged.
 */
async function authenticateApiKey(req, res, next) {
  try {
    let rawKey = req.headers['x-api-key'];
    if (!rawKey) {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) rawKey = auth.split(' ')[1];
    }
    if (!rawKey) throw new UnauthorizedError('API key required');

    const key = await apiKeysService.verify(rawKey);
    if (!key) throw new UnauthorizedError('Invalid or revoked API key');

    const tenant = await db.query(
      `SELECT * FROM tenants WHERE id = $1 AND status NOT IN ('deleted') LIMIT 1`,
      [key.tenant_id]
    );
    if (!tenant.rows[0]) throw new UnauthorizedError('Tenant not found');
    if (tenant.rows[0].status === 'suspended') throw new ForbiddenError('Account suspended');

    req.tenant = tenant.rows[0];
    req.apiKey = { id: key.id, scopes: key.scopes };
    next();
  } catch (err) {
    next(err);
  }
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) return next(new UnauthorizedError());
    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes('admin')) {
      return next(new ForbiddenError(`API key missing required scope: ${scope}`));
    }
    next();
  };
}

module.exports = { authenticateApiKey, requireScope };
