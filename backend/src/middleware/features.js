const { ForbiddenError } = require('../shared/errors');
const { resolveTenantFeatures, isFeatureEnabled } = require('../shared/features');

async function attachTenantFeatures(req, res, next) {
  try {
    if (req.tenant?.id) {
      req.tenantFeatures = await resolveTenantFeatures(req.tenant.id);
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      if (!req.tenant?.id) {
        throw new ForbiddenError('Tenant context required');
      }
      const features = await resolveTenantFeatures(req.tenant.id);
      req.tenantFeatures = features;
      if (!isFeatureEnabled(features, featureKey)) {
        throw new ForbiddenError(`Feature "${featureKey}" is not enabled for this business`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { attachTenantFeatures, requireFeature };
