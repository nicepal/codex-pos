const poService = require('./purchase-orders.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await poService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => {
    return success(res, await poService.getById(req.tenant.id, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await poService.create(req.tenant.id, req.body, req.user.id), 'Purchase order created');
  }),
  receive: asyncHandler(async (req, res) => {
    return success(res, await poService.receive(req.tenant.id, req.params.id, req.user.id), 'Purchase order received');
  }),
};
