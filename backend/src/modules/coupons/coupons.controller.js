const couponService = require('./coupons.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await couponService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => {
    return success(res, await couponService.getById(req.tenant.id, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await couponService.create(req.tenant.id, req.body));
  }),
  update: asyncHandler(async (req, res) => {
    return success(res, await couponService.update(req.tenant.id, req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    await couponService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Coupon deleted');
  }),
  validate: asyncHandler(async (req, res) => {
    const result = await couponService.validateAndApply(req.tenant.id, req.body.code, req.body.subtotal || 0);
    return success(res, result);
  }),
};
