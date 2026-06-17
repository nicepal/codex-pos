const expenseService = require('./expenses.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await expenseService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  dashboard: asyncHandler(async (req, res) => {
    return success(res, await expenseService.getDashboard(req.tenant.id, req.query));
  }),

  getById: asyncHandler(async (req, res) => {
    return success(res, await expenseService.getById(req.tenant.id, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    return created(res, await expenseService.create(req.tenant.id, req.body, req.user.id), 'Expense created');
  }),

  update: asyncHandler(async (req, res) => {
    return success(res, await expenseService.update(req.tenant.id, req.params.id, req.body), 'Expense updated');
  }),

  remove: asyncHandler(async (req, res) => {
    await expenseService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Expense deleted');
  }),

  bulkRemove: asyncHandler(async (req, res) => {
    const { parseBulkIds } = require('../../shared/bulk-delete');
    const ids = parseBulkIds(req.body);
    const result = await expenseService.bulkRemove(req.tenant.id, ids);
    return success(res, result, `${result.deleted} expense(s) deleted`);
  }),

  exportCsv: asyncHandler(async (req, res) => {
    const csv = await expenseService.exportCsv(req.tenant.id, req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    return res.send(csv);
  }),

  importCsv: asyncHandler(async (req, res) => {
    const result = await expenseService.importRows(req.tenant.id, req.body.rows, req.user.id);
    return success(res, result, `${result.imported} expense(s) imported`);
  }),
};
