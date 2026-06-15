const brandService = require('./brands.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await brandService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => {
    return success(res, await brandService.getById(req.tenant.id, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await brandService.create(req.tenant.id, req.body), 'Brand created');
  }),
  update: asyncHandler(async (req, res) => {
    return success(res, await brandService.update(req.tenant.id, req.params.id, req.body), 'Brand updated');
  }),
  remove: asyncHandler(async (req, res) => {
    await brandService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Brand deleted');
  }),
  bulkRemove: asyncHandler(async (req, res) => {
    const { parseBulkIds } = require('../../shared/bulk-delete');
    const ids = parseBulkIds(req.body);
    const result = await brandService.bulkRemove(req.tenant.id, ids);
    return success(res, result, `${result.deleted} brand(s) deleted`);
  }),
};
