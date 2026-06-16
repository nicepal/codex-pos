const customerService = require('./customers.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await customerService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  getById: asyncHandler(async (req, res) => {
    const customer = await customerService.getById(req.tenant.id, req.params.id);
    return success(res, customer);
  }),

  getDetail: asyncHandler(async (req, res) => {
    const customer = await customerService.getDetail(req.tenant.id, req.params.id);
    return success(res, customer);
  }),

  create: asyncHandler(async (req, res) => {
    const customer = await customerService.create(req.tenant.id, req.body);
    return created(res, customer);
  }),

  update: asyncHandler(async (req, res) => {
    const customer = await customerService.update(req.tenant.id, req.params.id, req.body);
    return success(res, customer);
  }),

  remove: asyncHandler(async (req, res) => {
    await customerService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Customer deleted');
  }),

  loyaltyHistory: asyncHandler(async (req, res) => {
    const loyaltyService = require('../loyalty/loyalty.service');
    const history = await loyaltyService.getHistory(req.tenant.id, req.params.id);
    return success(res, history);
  }),

  redeemLoyalty: asyncHandler(async (req, res) => {
    const loyaltyService = require('../loyalty/loyalty.service');
    const points = parseInt(req.body.points, 10);
    const tx = await loyaltyService.redeemPoints(req.tenant.id, req.params.id, points);
    return success(res, tx, 'Points redeemed');
  }),

  merge: asyncHandler(async (req, res) => {
    const customer = await customerService.merge(req.tenant.id, req.params.id, req.body.merge_id);
    return success(res, customer, 'Customers merged');
  }),
};
