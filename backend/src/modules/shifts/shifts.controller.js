const shiftsService = require('./shifts.service');
const { success, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  clockIn: asyncHandler(async (req, res) => {
    const row = await shiftsService.clockIn(req.tenant.id, req.body, req.user?.id);
    return success(res, row, 'Clocked in', 201);
  }),
  clockOut: asyncHandler(async (req, res) => {
    const row = await shiftsService.clockOut(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Clocked out');
  }),
  current: asyncHandler(async (req, res) => {
    const row = await shiftsService.current(req.tenant.id, req.query.employee_id || req.body.employee_id);
    return success(res, row);
  }),
  list: asyncHandler(async (req, res) => {
    const result = await shiftsService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  zReport: asyncHandler(async (req, res) => {
    const row = await shiftsService.zReport(req.tenant.id, req.params.id);
    return success(res, row);
  }),
  xReport: asyncHandler(async (req, res) => {
    const row = await shiftsService.xReport(req.tenant.id, req.params.id);
    return success(res, row);
  }),
};
