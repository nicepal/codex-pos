const { ForbiddenError } = require('../shared/errors');
const { resolveTenantFeatures, isFeatureEnabled } = require('../shared/features');

async function attachTenantFeatures(req, res, next) {
  try {
    if (req.tenant?.id) {
      req.tenantFeatures = await resolveTenantFeatures(req.tenant.id);
    } else {
      req.tenantFeatures = {};
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const features = req.tenantFeatures || await resolveTenantFeatures(req.tenant?.id);
      if (!isFeatureEnabled(features, featureKey)) {
        throw new ForbiddenError(`Feature "${featureKey}" is not enabled for this business`);
      }
      req.tenantFeatures = features;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { attachTenantFeatures, requireFeature };
