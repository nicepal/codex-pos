const orderService = require('./orders.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await orderService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),

  getById: asyncHandler(async (req, res) => {
    const order = await orderService.getById(req.tenant.id, req.params.id);
    return success(res, order);
  }),

  create: asyncHandler(async (req, res) => {
    const order = await orderService.createPOSOrder(req.tenant.id, req.body, req.user.id);
    return created(res, order);
  }),

  hold: asyncHandler(async (req, res) => {
    const order = await orderService.holdSale(req.tenant.id, req.body, req.user.id);
    return created(res, order, 'Sale held');
  }),

  resume: asyncHandler(async (req, res) => {
    const order = await orderService.resumeSale(req.tenant.id, req.params.id, req.body, req.user.id);
    return success(res, order, 'Sale resumed');
  }),

  restore: asyncHandler(async (req, res) => {
    const cart = await orderService.restoreHeldSale(req.tenant.id, req.params.id);
    return success(res, cart, 'Held sale restored to cart');
  }),

  held: asyncHandler(async (req, res) => {
    const orders = await orderService.listHeld(req.tenant.id);
    return success(res, orders);
  }),

  receipt: asyncHandler(async (req, res) => {
    const receipt = await orderService.getReceipt(req.tenant.id, req.params.id);
    return success(res, receipt);
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const order = req.body.status === 'refunded'
      ? await orderService.refundOrder(req.tenant.id, req.params.id, req.user.id)
      : await orderService.updateStatus(req.tenant.id, req.params.id, req.body.status);
    return success(res, order);
  }),

  returnOrder: asyncHandler(async (req, res) => {
    const result = await orderService.returnOrder(req.tenant.id, req.params.id, req.body, req.user.id);
    return success(res, result, 'Return processed');
  }),
};
