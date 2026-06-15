const affiliateService = require('./affiliates.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    return success(res, await affiliateService.list());
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await affiliateService.create(req.body.user_id, req.body.commission_rate));
  }),
  commissions: asyncHandler(async (req, res) => {
    return success(res, await affiliateService.getCommissions(req.params.id));
  }),
  approve: asyncHandler(async (req, res) => {
    return success(res, await affiliateService.approveCommission(req.params.commissionId));
  }),
  pay: asyncHandler(async (req, res) => {
    return success(res, await affiliateService.payCommission(req.params.commissionId), 'Commission paid');
  }),
};
