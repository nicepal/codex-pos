const router = require('express').Router();
const controller = require('./storefront.controller');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { checkoutSchema } = require('../orders/orders.validation');

const { requireFeature } = require('../../middleware/features');
const { asyncHandler } = require('../../middleware/errorHandler');
const { ForbiddenError, NotFoundError } = require('../../shared/errors');
const { success } = require('../../shared/response');
const db = require('../../config/database');
const reviewsService = require('../reviews/reviews.service');
const { service: storefrontCustomers, authenticateStorefrontCustomer } = require('./storefront-customers.service');

async function resolveProductId(tenantId, slug) {
  const result = await db.query(
    `SELECT id FROM products WHERE tenant_id = $1 AND slug = $2 AND status = 'active'`,
    [tenantId, slug]
  );
  if (!result.rows[0]) throw new NotFoundError('Product not found');
  return result.rows[0].id;
}

// Optional storefront auth: attaches customer id when a valid token is present
function optionalStorefrontAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticateStorefrontCustomer(req, res, (err) => next(err && err.statusCode === 401 ? null : err));
}

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

// ---- Product reviews ----
router.get('/products/:slug/reviews', asyncHandler(async (req, res) => {
  const productId = await resolveProductId(req.tenant.id, req.params.slug);
  const result = await reviewsService.listForProduct(req.tenant.id, productId, req.query);
  return success(res, result);
}));

router.post('/products/:slug/reviews', optionalStorefrontAuth, asyncHandler(async (req, res) => {
  const productId = await resolveProductId(req.tenant.id, req.params.slug);
  const result = await reviewsService.submit(req.tenant.id, productId, req.body, req.storefrontCustomerId || null);
  return success(res, result, 'Review submitted', 201);
}));

// ---- Customer accounts ----
router.post('/account/register', asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.register(req.tenant.id, req.body), 'Account created', 201);
}));

router.post('/account/login', asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.login(req.tenant.id, req.body.email, req.body.password), 'Logged in');
}));

router.get('/account/me', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.getById(req.tenant.id, req.storefrontCustomerId));
}));

router.get('/account/orders', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.orders(req.tenant.id, req.storefrontCustomerId));
}));

router.get('/account/addresses', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.listAddresses(req.tenant.id, req.storefrontCustomerId));
}));

router.post('/account/addresses', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.addAddress(req.tenant.id, req.storefrontCustomerId, req.body), 'Address saved', 201);
}));

router.get('/account/wishlist', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.wishlist(req.tenant.id, req.storefrontCustomerId));
}));

router.post('/account/wishlist/:productId', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  return success(res, await storefrontCustomers.toggleWishlist(req.tenant.id, req.storefrontCustomerId, req.params.productId));
}));

module.exports = router;
