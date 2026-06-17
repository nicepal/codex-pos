const router = require('express').Router();
const controller = require('./storefront.controller');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { checkoutSchema } = require('../orders/orders.validation');

const { requireFeature } = require('../../middleware/features');
const { asyncHandler } = require('../../middleware/errorHandler');
const { ForbiddenError } = require('../../shared/errors');

async function requireOmnichannel(req, res, next) {
  try {
    const { isFeatureEnabled, resolveTenantFeatures } = require('../../shared/features');
    const resolved = await resolveTenantFeatures(req.tenant?.id);
    if (!isFeatureEnabled(resolved, 'omnichannel')) {
      throw new ForbiddenError('Online storefront is not enabled for this business');
    }
    req.tenantFeatures = resolved;
    next();
  } catch (err) {
    next(err);
  }
}

router.use(requireTenant, requireOmnichannel);

router.get('/', controller.storeInfo);
router.get('/products', controller.products);
router.get('/products/:slug', controller.product);
router.get('/categories', controller.categories);
router.get('/branches', controller.branches);
router.post('/checkout', validate(checkoutSchema), controller.checkout);
router.get('/theme', controller.theme);
router.get('/sitemap', controller.sitemap);

module.exports = router;
