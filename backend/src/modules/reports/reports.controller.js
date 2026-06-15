const reportService = require('./reports.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  dashboard: asyncHandler(async (req, res) => {
    const stats = await reportService.businessDashboard(req.tenant.id);
    return success(res, stats);
  }),

  sales: asyncHandler(async (req, res) => {
    const data = await reportService.salesReport(req.tenant.id, req.query);
    return success(res, data);
  }),

  topProducts: asyncHandler(async (req, res) => {
    const data = await reportService.topProducts(req.tenant.id, parseInt(req.query.limit, 10) || 10);
    return success(res, data);
  }),

  inventory: asyncHandler(async (req, res) => {
    const data = await reportService.inventoryReport(req.tenant.id);
    return success(res, data);
  }),

  financial: asyncHandler(async (req, res) => {
    const data = await reportService.financialReport(req.tenant.id, req.query.from, req.query.to);
    return success(res, data);
  }),

  advanced: asyncHandler(async (req, res) => {
    const data = await reportService.advancedAnalytics(req.tenant.id);
    return success(res, data);
  }),
};
