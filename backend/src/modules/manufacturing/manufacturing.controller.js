const service = require('./manufacturing.service');
const { success, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  listBoms: asyncHandler(async (req, res) => {
    return success(res, await service.listBoms(req.tenant.id));
  }),

  getBom: asyncHandler(async (req, res) => {
    return success(res, await service.getBom(req.tenant.id, req.params.id));
  }),

  createBom: asyncHandler(async (req, res) => {
    const row = await service.createBom(req.tenant.id, req.body);
    return success(res, row, 'BOM created', 201);
  }),

  updateBom: asyncHandler(async (req, res) => {
    const row = await service.updateBom(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'BOM updated');
  }),

  deleteBom: asyncHandler(async (req, res) => {
    return success(res, await service.deleteBom(req.tenant.id, req.params.id), 'BOM deleted');
  }),

  listProductionOrders: asyncHandler(async (req, res) => {
    const result = await service.listProductionOrders(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  createProductionOrder: asyncHandler(async (req, res) => {
    const row = await service.createProductionOrder(req.tenant.id, req.body, req.user?.id);
    return success(res, row, 'Production order created', 201);
  }),

  completeProductionOrder: asyncHandler(async (req, res) => {
    const row = await service.completeProductionOrder(req.tenant.id, req.params.id, req.user?.id);
    return success(res, row, 'Production order completed');
  }),
};
