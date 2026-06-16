const transferService = require('./transfers.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await transferService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => {
    return success(res, await transferService.getById(req.tenant.id, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await transferService.create(req.tenant.id, req.body, req.user.id));
  }),
  complete: asyncHandler(async (req, res) => {
    return success(res, await transferService.complete(req.tenant.id, req.params.id, req.user.id), 'Transfer completed');
  }),
};
