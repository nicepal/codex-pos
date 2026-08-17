const service = require('./accounting.service');
const { success, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  listAccounts: asyncHandler(async (req, res) => {
    return success(res, await service.listAccounts(req.tenant.id));
  }),

  createAccount: asyncHandler(async (req, res) => {
    const row = await service.createAccount(req.tenant.id, req.body);
    return success(res, row, 'Account created', 201);
  }),

  createJournal: asyncHandler(async (req, res) => {
    const row = await service.createJournal(req.tenant.id, req.body, req.user?.id);
    return success(res, row, 'Journal entry created', 201);
  }),

  listJournals: asyncHandler(async (req, res) => {
    const result = await service.listJournals(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  profitLoss: asyncHandler(async (req, res) => {
    return success(res, await service.profitLoss(req.tenant.id, req.query));
  }),

  balanceSheet: asyncHandler(async (req, res) => {
    return success(res, await service.balanceSheet(req.tenant.id, req.query));
  }),

  cashFlow: asyncHandler(async (req, res) => {
    return success(res, await service.cashFlow(req.tenant.id, req.query));
  }),

  taxReport: asyncHandler(async (req, res) => {
    return success(res, await service.taxReport(req.tenant.id, req.query));
  }),

  listExchangeRates: asyncHandler(async (req, res) => {
    return success(res, await service.listExchangeRates(req.tenant.id));
  }),

  upsertExchangeRate: asyncHandler(async (req, res) => {
    const row = await service.upsertExchangeRate(req.tenant.id, req.body);
    return success(res, row, 'Exchange rate saved', 201);
  }),
};
