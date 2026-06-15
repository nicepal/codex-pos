const db = require('../config/database');

function auditLog(action, entityType = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode < 400) {
        setImmediate(async () => {
          try {
            await db.query(
              `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                req.tenant?.id || req.user?.tenant_id || null,
                req.user?.id || null,
                action,
                entityType,
                body?.data?.id || req.params?.id || null,
                body?.data ? JSON.stringify(body.data) : null,
                req.ip,
                req.headers['user-agent'],
              ]
            );
          } catch (_) { /* non-blocking */ }
        });
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditLog };
