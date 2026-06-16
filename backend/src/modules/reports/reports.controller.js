const reportService = require('./reports.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  dashboard: asyncHandler(async (req, res) => {
    const stats = await reportService.businessDashboard(req.tenant.id);
    return success(res, stats);
  }),

  dashboardOverview: asyncHandler(async (req, res) => {
    const data = await reportService.dashboardOverview(req.tenant.id, req.query.range);
    return success(res, data);
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

  exportSales: asyncHandler(async (req, res) => {
    const csv = await reportService.exportSalesCsv(req.tenant.id, req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
    return res.send(csv);
  }),

  scheduleReport: asyncHandler(async (req, res) => {
    const row = await reportService.scheduleReport(req.tenant.id, req.body);
    return success(res, row, 'Report scheduled');
  }),

  exportData: asyncHandler(async (req, res) => {
    const data = await reportService.exportTenantData(req.tenant.id);
    return success(res, data);
  }),
};
