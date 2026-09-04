const router = require('express').Router();
const controller = require('./storefront.controller');
const { requireTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const { checkoutSchema } = require('../orders/orders.validation');

const { asyncHandler } = require('../../middleware/errorHandler');
const { ForbiddenError, NotFoundError } = require('../../shared/errors');
const { success } = require('../../shared/response');
const db = require('../../config/database');
const reviewsService = require('../reviews/reviews.service');
const { service: storefrontCustomers, authenticateStorefrontCustomer } = require('./storefront-customers.service');
const { buildShopOg, buildProductOg } = require('./storefront.og.service');

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

/**
 * Crawler / social-share Open Graph HTML (no tenant header required).
 * Nginx routes bot requests for /store/:slug to these endpoints.
 */
router.get('/og/:slug/product/:productSlug', asyncHandler(async (req, res) => {
  const html = await buildProductOg(req, req.params.slug, req.params.productSlug);
  if (!html) throw new NotFoundError('Product not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).send(html);
}));

router.get('/og/:slug', asyncHandler(async (req, res) => {
  const html = await buildShopOg(req, req.params.slug);
  if (!html) throw new NotFoundError('Store not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).send(html);
}));

/**
 * Public shop access is controlled by Settings → "Enable online shop"
 * (`storefront_enabled`), not the omnichannel pack (that pack gates custom
 * domains / webhooks / marketplace). Omnichannel still unlocks the shop when
 * the merchant has never toggled the setting.
 */
async function requireStorefrontAccess(req, res, next) {
  try {
    const { isFeatureEnabled, resolveTenantFeatures } = require('../../shared/features');
    const checkoutService = require('./storefront.checkout.service');
    const resolved = await resolveTenantFeatures(req.tenant?.id);
    req.tenantFeatures = resolved;

    const theme = await checkoutService.getTheme(req.tenant.id);
    const flag = theme?.theme?.storefront_enabled;
    const explicitlyOn = flag === true || flag === 'true';
    const explicitlyOff = flag === false || flag === 'false';

    if (explicitlyOff) {
      throw new ForbiddenError('Online storefront is not enabled for this business');
    }
    if (explicitlyOn || isFeatureEnabled(resolved, 'omnichannel')) {
      return next();
    }
    throw new ForbiddenError('Online storefront is not enabled for this business');
  } catch (err) {
    next(err);
  }
}

router.use(requireTenant, requireStorefrontAccess);

router.get('/', controller.storeInfo);
router.get('/products', controller.products);
router.get('/products/:slug', controller.product);
router.get('/categories', controller.categories);
router.get('/branches', controller.branches);
router.get('/loyalty-preview', controller.loyaltyPreview);
router.post('/checkout', optionalStorefrontAuth, validate(checkoutSchema), controller.checkout);
router.get('/theme', controller.theme);
router.get('/sitemap', controller.sitemap);

// ---- Product reviews ----
router.get('/products/:slug/reviews', optionalStorefrontAuth, asyncHandler(async (req, res) => {
  const productId = await resolveProductId(req.tenant.id, req.params.slug);
  const result = await reviewsService.listForProduct(
    req.tenant.id,
    productId,
    req.query,
    req.storefrontCustomerId || null
  );
  return success(res, result);
}));

router.post('/products/:slug/reviews', authenticateStorefrontCustomer, asyncHandler(async (req, res) => {
  const productId = await resolveProductId(req.tenant.id, req.params.slug);
  const result = await reviewsService.submit(req.tenant.id, productId, req.body, req.storefrontCustomerId);
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
