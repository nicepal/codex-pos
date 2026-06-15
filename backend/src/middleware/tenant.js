const db = require('../config/database');
const config = require('../config');
const { TenantError } = require('../shared/errors');
const { getRedis } = require('../config/redis');

async function resolveTenantFromHost(host) {
  const cleanHost = host.split(':')[0].toLowerCase();

  const redis = getRedis();
  const cacheKey = `tenant:domain:${cleanHost}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await db.query(
    `SELECT t.*, td.domain, td.domain_type
     FROM tenant_domains td
     JOIN tenants t ON t.id = td.tenant_id
     WHERE td.domain = $1 AND t.status NOT IN ('deleted')
     LIMIT 1`,
    [cleanHost]
  );

  if (!result.rows[0]) {
    const platformDomain = config.app.platformDomain;
    if (cleanHost.endsWith(`.${platformDomain}`)) {
      const slug = cleanHost.replace(`.${platformDomain}`, '');
      const slugResult = await db.query(
        `SELECT * FROM tenants WHERE slug = $1 AND status NOT IN ('deleted') LIMIT 1`,
        [slug]
      );
      if (slugResult.rows[0]) {
        await redis.setex(cacheKey, 300, JSON.stringify(slugResult.rows[0]));
        return slugResult.rows[0];
      }
    }
    return null;
  }

  const tenant = result.rows[0];
  await redis.setex(cacheKey, 300, JSON.stringify(tenant));
  return tenant;
}

async function tenantResolver(req, res, next) {
  try {
    const host = req.headers['x-tenant-domain'] || req.headers.host || '';
    const tenantSlug = req.headers['x-tenant-slug'];

    if (tenantSlug) {
      const result = await db.query(
        `SELECT * FROM tenants WHERE slug = $1 AND status NOT IN ('deleted') LIMIT 1`,
        [tenantSlug]
      );
      if (result.rows[0]) {
        req.tenant = result.rows[0];
        return next();
      }
    }

    if (host) {
      const tenant = await resolveTenantFromHost(host);
      if (tenant) {
        req.tenant = tenant;
        return next();
      }
    }

    if (req.path.startsWith('/api/v1/storefront') || req.path.includes('/storefront/')) {
      return next(new TenantError('Store not found'));
    }

    next();
  } catch (err) {
    next(err);
  }
}

async function requireTenant(req, res, next) {
  try {
    // Authenticated business users always use their own tenant (ignore stale X-Tenant-Slug)
    if (req.user?.tenant_id) {
      const result = await db.query(
        `SELECT * FROM tenants WHERE id = $1 AND status NOT IN ('deleted') LIMIT 1`,
        [req.user.tenant_id]
      );
      if (result.rows[0]) {
        req.tenant = result.rows[0];
      }
    } else if (!req.tenant) {
      return next(new TenantError('Tenant context required'));
    }

    if (!req.tenant) {
      return next(new TenantError('Tenant context required'));
    }
    if (['suspended', 'expired'].includes(req.tenant.status)) {
      return next(new TenantError(`Business account is ${req.tenant.status}`));
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { tenantResolver, requireTenant, resolveTenantFromHost };
