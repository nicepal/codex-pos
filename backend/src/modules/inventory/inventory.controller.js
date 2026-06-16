const inventoryService = require('./inventory.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await inventoryService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  stockIn: asyncHandler(async (req, res) => {
    const tx = await inventoryService.stockIn(req.tenant.id, req.body, req.user.id);
    return created(res, tx);
  }),

  stockOut: asyncHandler(async (req, res) => {
    const tx = await inventoryService.stockOut(req.tenant.id, req.body, req.user.id);
    return created(res, tx);
  }),

  adjustment: asyncHandler(async (req, res) => {
    const tx = await inventoryService.adjustment(req.tenant.id, req.body, req.user.id);
    return created(res, tx);
  }),

  lowStock: asyncHandler(async (req, res) => {
    const products = await inventoryService.lowStock(req.tenant.id);
    return success(res, products);
  }),

  createStockTake: asyncHandler(async (req, res) => {
    const session = await inventoryService.createStockTake(req.tenant.id, req.body, req.user.id);
    return created(res, session);
  }),

  listStockTake: asyncHandler(async (req, res) => {
    const result = await inventoryService.listStockTakeSessions(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  getOpenStockTake: asyncHandler(async (req, res) => {
    const session = await inventoryService.getOpenStockTakeSession(req.tenant.id);
    return success(res, session);
  }),

  getStockTake: asyncHandler(async (req, res) => {
    const session = await inventoryService.getStockTakeSession(req.tenant.id, req.params.sessionId);
    return success(res, session);
  }),

  addStockTakeLine: asyncHandler(async (req, res) => {
    const line = await inventoryService.addStockTakeLine(req.tenant.id, req.params.sessionId, req.body);
    return success(res, line);
  }),

  completeStockTake: asyncHandler(async (req, res) => {
    const session = await inventoryService.completeStockTake(req.tenant.id, req.params.sessionId, req.user.id);
    return success(res, session, 'Stock take completed');
  }),

  cancelStockTake: asyncHandler(async (req, res) => {
    const session = await inventoryService.cancelStockTake(req.tenant.id, req.params.sessionId);
    return success(res, session, 'Stock take cancelled');
  }),
};
