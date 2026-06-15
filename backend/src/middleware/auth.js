const db = require('../config/database');
const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const userResult = await db.query(
      `SELECT u.*, array_agg(DISTINCT r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1 AND u.status = 'active'
       GROUP BY u.id`,
      [decoded.userId]
    );

    if (!userResult.rows[0]) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const user = userResult.rows[0];
    user.roles = user.roles?.filter(Boolean) || [];

    const permResult = await db.query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    user.permissions = permResult.rows.map((r) => r.name);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError(err.message));
    }
    next(err);
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  return authenticate(req, res, next);
}

function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());

    const isSuperAdmin = req.user.roles.includes('super_admin');
    if (isSuperAdmin) return next();

    const hasPermission = requiredPermissions.some((p) =>
      req.user.permissions.includes(p)
    );

    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

function requirePlatformAdmin(req, res, next) {
  const platformRoles = ['super_admin', 'support_agent', 'billing_manager', 'content_manager'];
  const hasRole = req.user?.roles.some((r) => platformRoles.includes(r));
  if (!hasRole) return next(new ForbiddenError('Platform admin access required'));
  next();
}

async function requireTenantAccess(req, res, next) {
  try {
    if (!req.user) return next(new UnauthorizedError());

    const isPlatformAdmin = req.user.roles.some((r) =>
      ['super_admin', 'support_agent'].includes(r)
    );
    if (isPlatformAdmin) return next();

    const needsUserTenant = !req.tenant
      || (req.user.tenant_id && req.user.tenant_id !== req.tenant.id);

    if (needsUserTenant && req.user.tenant_id) {
      const result = await db.query(
        `SELECT * FROM tenants WHERE id = $1 AND status NOT IN ('deleted') LIMIT 1`,
        [req.user.tenant_id]
      );
      if (!result.rows[0]) {
        return next(new ForbiddenError('Access denied to this tenant'));
      }
      req.tenant = result.rows[0];
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requirePlatformAdmin,
  requireTenantAccess,
};
