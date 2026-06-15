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
};
