const categoryService = require('./categories.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await categoryService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  getById: asyncHandler(async (req, res) => {
    const cat = await categoryService.getById(req.tenant.id, req.params.id);
    return success(res, cat);
  }),

  create: asyncHandler(async (req, res) => {
    const cat = await categoryService.create(req.tenant.id, req.body);
    return created(res, cat);
  }),

  update: asyncHandler(async (req, res) => {
    const cat = await categoryService.update(req.tenant.id, req.params.id, req.body);
    return success(res, cat);
  }),

  remove: asyncHandler(async (req, res) => {
    await categoryService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Category deleted');
  }),

  bulkRemove: asyncHandler(async (req, res) => {
    const { parseBulkIds } = require('../../shared/bulk-delete');
    const ids = parseBulkIds(req.body);
    const result = await categoryService.bulkRemove(req.tenant.id, ids);
    return success(res, result, `${result.deleted} category(ies) deleted`);
  }),
};
