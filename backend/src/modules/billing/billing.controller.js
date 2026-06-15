const billingService = require('./billing.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await billingService.listAll(req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  getById: asyncHandler(async (req, res) => {
    const invoice = await billingService.getById(req.params.id);
    return success(res, invoice);
  }),

  create: asyncHandler(async (req, res) => {
    const invoice = await billingService.createInvoice(req.body);
    return created(res, invoice);
  }),

  markPaid: asyncHandler(async (req, res) => {
    const invoice = await billingService.markPaid(req.params.id, req.body);
    return success(res, invoice, 'Invoice marked as paid');
  }),

  cancel: asyncHandler(async (req, res) => {
    const invoice = await billingService.cancel(req.params.id);
    return success(res, invoice, 'Invoice cancelled');
  }),
};
