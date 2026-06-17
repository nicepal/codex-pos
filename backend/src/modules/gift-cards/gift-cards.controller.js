const { asyncHandler } = require('../../middleware/errorHandler');
const { success, paginated, created } = require('../../shared/response');
const service = require('./gift-cards.service');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await service.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  checkBalance: asyncHandler(async (req, res) => {
    return success(res, await service.checkBalance(req.tenant.id, req.params.code));
  }),
  issue: asyncHandler(async (req, res) => {
    return created(res, await service.issue(req.tenant.id, req.body, req.user?.id), 'Gift card issued');
  }),
  redeem: asyncHandler(async (req, res) => {
    const result = await service.redeem(req.tenant.id, req.body.code, req.body.amount, { note: req.body.note });
    return success(res, result, 'Gift card redeemed');
  }),
  transactions: asyncHandler(async (req, res) => {
    return success(res, await service.transactions(req.tenant.id, req.params.id));
  }),
  deactivate: asyncHandler(async (req, res) => {
    return success(res, await service.deactivate(req.tenant.id, req.params.id), 'Gift card deactivated');
  }),
};
