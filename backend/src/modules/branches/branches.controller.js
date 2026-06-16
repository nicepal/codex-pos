const branchService = require('./branches.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await branchService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => {
    return success(res, await branchService.getById(req.tenant.id, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await branchService.create(req.tenant.id, req.body));
  }),
  update: asyncHandler(async (req, res) => {
    return success(res, await branchService.update(req.tenant.id, req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    await branchService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Branch deleted');
  }),
  bulkRemove: asyncHandler(async (req, res) => {
    const { parseBulkIds } = require('../../shared/bulk-delete');
    const ids = parseBulkIds(req.body);
    const result = await branchService.bulkRemove(req.tenant.id, ids);
    return success(res, result, `${result.deleted} branch(es) deleted`);
  }),
};
