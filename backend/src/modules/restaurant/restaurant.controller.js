const service = require('./restaurant.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  getSettings: asyncHandler(async (req, res) => {
    return success(res, await service.getSettings(req.tenant.id));
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const row = await service.updateSettings(req.tenant.id, req.body);
    return success(res, row, 'Restaurant settings updated');
  }),

  listFloors: asyncHandler(async (req, res) => {
    return success(res, await service.listFloors(req.tenant.id, req.query));
  }),

  createFloor: asyncHandler(async (req, res) => {
    const row = await service.createFloor(req.tenant.id, req.body);
    return success(res, row, 'Floor created', 201);
  }),

  updateFloor: asyncHandler(async (req, res) => {
    const row = await service.updateFloor(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Floor updated');
  }),

  deleteFloor: asyncHandler(async (req, res) => {
    return success(res, await service.deleteFloor(req.tenant.id, req.params.id), 'Floor deleted');
  }),

  listTables: asyncHandler(async (req, res) => {
    return success(res, await service.listTables(req.tenant.id, req.query));
  }),

  createTable: asyncHandler(async (req, res) => {
    const row = await service.createTable(req.tenant.id, req.body);
    return success(res, row, 'Table created', 201);
  }),

  updateTable: asyncHandler(async (req, res) => {
    const row = await service.updateTable(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Table updated');
  }),

  deleteTable: asyncHandler(async (req, res) => {
    return success(res, await service.deleteTable(req.tenant.id, req.params.id), 'Table deleted');
  }),

  getSession: asyncHandler(async (req, res) => {
    return success(res, await service.getActiveSession(req.tenant.id, req.params.id));
  }),

  openTable: asyncHandler(async (req, res) => {
    const row = await service.openTableSession(req.tenant.id, req.params.id, req.body);
    return success(res, row, 'Table session opened', 201);
  }),

  closeTable: asyncHandler(async (req, res) => {
    const row = await service.closeTableSession(req.tenant.id, req.params.id);
    return success(res, row, 'Table session closed');
  }),

  getActiveOrder: asyncHandler(async (req, res) => {
    return success(res, await service.getActiveOrderForTable(req.tenant.id, req.params.id));
  }),

  dashboard: asyncHandler(async (req, res) => {
    return success(res, await service.getDashboard(req.tenant.id, req.query));
  }),

  sendOrderToKitchen: asyncHandler(async (req, res) => {
    const result = await service.sendOrderToKitchen(
      req.tenant.id,
      req.params.orderId,
      req.body,
      req.user?.id
    );
    return success(res, result, 'Sent to kitchen');
  }),

  appendOrderItems: asyncHandler(async (req, res) => {
    const result = await service.appendOrderItems(
      req.tenant.id,
      req.params.orderId,
      req.body,
      req.user?.id
    );
    return success(res, result, 'Items added to order');
  }),
};
