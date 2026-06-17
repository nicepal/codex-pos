const storefrontService = require('./storefront.service');
const checkoutService = require('./storefront.checkout.service');
const { success, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../shared/errors');

module.exports = {
  storeInfo: asyncHandler(async (req, res) => {
    if (!req.tenant) throw new NotFoundError('Store not found');
    const info = await storefrontService.getStoreInfo(req.tenant);
    return success(res, info);
  }),

  products: asyncHandler(async (req, res) => {
    const result = await storefrontService.getProducts(req.tenant.id, req.query);
    return res.json({ success: true, data: result.products, pagination: result.pagination });
  }),

  product: asyncHandler(async (req, res) => {
    const product = await storefrontService.getProduct(req.tenant.id, req.params.slug);
    if (!product) throw new NotFoundError('Product not found');
    const related = await storefrontService.getRelatedProducts(
      req.tenant.id, product.id, product.category_id
    );
    return success(res, { ...product, related });
  }),

  categories: asyncHandler(async (req, res) => {
    const categories = await storefrontService.getCategories(req.tenant.id);
    return success(res, categories);
  }),

  branches: asyncHandler(async (req, res) => {
    const branches = await storefrontService.getPickupBranches(req.tenant.id);
    return success(res, branches);
  }),

  checkout: asyncHandler(async (req, res) => {
    const order = await checkoutService.checkout(req.tenant.id, req.body);
    return success(res, order, 'Order placed');
  }),

  theme: asyncHandler(async (req, res) => {
    const theme = await checkoutService.getTheme(req.tenant.id);
    return success(res, theme);
  }),

  sitemap: asyncHandler(async (req, res) => {
    const sitemap = await checkoutService.getSitemap(req.tenant.id);
    return success(res, sitemap);
  }),
};
