const { asyncHandler } = require('../../middleware/errorHandler');
const { success, paginated } = require('../../shared/response');
const service = require('./reviews.service');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await service.listForTenant(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  moderate: asyncHandler(async (req, res) => success(
    res,
    await service.moderate(req.tenant.id, req.params.id, req.body.status),
    'Review updated'
  )),
  remove: asyncHandler(async (req, res) => success(res, await service.remove(req.tenant.id, req.params.id), 'Review deleted')),
};
