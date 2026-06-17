const businessService = require('./businesses.service');
const { success, paginated, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

class BusinessController {
  list = asyncHandler(async (req, res) => {
    const result = await businessService.list(req.query);
    return paginated(res, result.businesses, result.pagination);
  });

  create = asyncHandler(async (req, res) => {
    const business = await businessService.create(req.body);
    return created(res, business, 'Business created');
  });

  getById = asyncHandler(async (req, res) => {
    const business = await businessService.getById(req.params.id);
    return success(res, business);
  });

  tenantDashboard = asyncHandler(async (req, res) => {
    const data = await businessService.getTenantDashboard(req.params.id);
    return success(res, data);
  });

  update = asyncHandler(async (req, res) => {
    const business = await businessService.update(req.params.id, req.body);
    return success(res, business, 'Business updated');
  });

  suspend = asyncHandler(async (req, res) => {
    const business = await businessService.suspend(req.params.id);
    return success(res, business, 'Business suspended');
  });

  activate = asyncHandler(async (req, res) => {
    const business = await businessService.activate(req.params.id);
    return success(res, business, 'Business activated');
  });

  remove = asyncHandler(async (req, res) => {
    await businessService.delete(req.params.id);
    return success(res, null, 'Business deleted');
  });

  extendTrial = asyncHandler(async (req, res) => {
    const result = await businessService.extendTrial(req.params.id, req.body.days || 14);
    return success(res, result, 'Trial extended');
  });

  dashboard = asyncHandler(async (req, res) => {
    const stats = await businessService.getDashboardStats();
    return success(res, stats);
  });

  charts = asyncHandler(async (req, res) => {
    const data = await businessService.getGrowthCharts(parseInt(req.query.months, 10) || 12);
    return success(res, data);
  });

  upgradePlan = asyncHandler(async (req, res) => {
    const sub = await businessService.upgradePlan(req.params.id, req.body.plan_id, req.body.billing_cycle);
    return success(res, sub, 'Plan upgraded');
  });

  invoices = asyncHandler(async (req, res) => {
    const result = await businessService.getInvoices(req.params.id, req.query);
    return paginated(res, result.rows, result.pagination);
  });
}

module.exports = new BusinessController();
