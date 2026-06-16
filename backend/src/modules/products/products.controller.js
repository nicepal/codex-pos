const productService = require('./products.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await productService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  getById: asyncHandler(async (req, res) => {
    const product = await productService.getById(req.tenant.id, req.params.id);
    return success(res, product);
  }),

  create: asyncHandler(async (req, res) => {
    const product = await productService.create(req.tenant.id, req.body);
    return created(res, product);
  }),

  update: asyncHandler(async (req, res) => {
    const product = await productService.update(req.tenant.id, req.params.id, req.body);
    return success(res, product);
  }),

  duplicate: asyncHandler(async (req, res) => {
    const product = await productService.duplicate(req.tenant.id, req.params.id);
    return created(res, product, 'Product duplicated');
  }),

  remove: asyncHandler(async (req, res) => {
    await productService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Product deleted');
  }),

  bulkRemove: asyncHandler(async (req, res) => {
    const { parseBulkIds } = require('../../shared/bulk-delete');
    const ids = parseBulkIds(req.body);
    const result = await productService.bulkRemove(req.tenant.id, ids);
    return success(res, result, `${result.deleted} product(s) deleted`);
  }),

  search: asyncHandler(async (req, res) => {
    const products = await productService.search(req.tenant.id, req.query.q, {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      category_id: req.query.category_id || null,
    });
    return success(res, products);
  }),

  uploadImage: asyncHandler(async (req, res) => {
    const { saveFile } = require('../../services/upload.service');
    if (!req.file) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('No image file provided');
    }
    const saved = await saveFile(req.file, { subfolder: `tenants/${req.tenant.id}/products` });
    const image = await productService.addImage(req.tenant.id, req.params.id, {
      url: saved.url,
      alt_text: req.body.alt_text,
      is_primary: req.body.is_primary === 'true',
    });
    return created(res, image, 'Image uploaded');
  }),

  removeImage: asyncHandler(async (req, res) => {
    await productService.removeImage(req.tenant.id, req.params.id, req.params.imageId);
    return success(res, null, 'Image removed');
  }),

  deleteVariant: asyncHandler(async (req, res) => {
    await productService.deleteVariant(req.tenant.id, req.params.id, req.params.variantId);
    return success(res, null, 'Variant deleted');
  }),

  importCsv: asyncHandler(async (req, res) => {
    const result = await productService.importCsv(req.tenant.id, req.body.rows);
    return success(res, result, `${result.imported} products imported`);
  }),
};
