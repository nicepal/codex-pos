const router = require('express').Router();
const { authenticateApiKey, requireScope } = require('../../middleware/apiKeyAuth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, paginated } = require('../../shared/response');
const productService = require('../products/products.service');
const orderService = require('../orders/orders.service');
const customerService = require('../customers/customers.service');

router.use(authenticateApiKey);

// Health / identity
router.get('/me', asyncHandler(async (req, res) => success(res, {
  tenant_id: req.tenant.id,
  tenant_name: req.tenant.name,
  scopes: req.apiKey.scopes,
})));

// Products
router.get('/products', requireScope('read'), asyncHandler(async (req, res) => {
  const result = await productService.list(req.tenant.id, req.query);
  return paginated(res, result.rows, result.pagination);
}));

router.get('/products/:id', requireScope('read'), asyncHandler(async (req, res) => {
  return success(res, await productService.getById(req.tenant.id, req.params.id));
}));

// Orders
router.get('/orders', requireScope('read'), asyncHandler(async (req, res) => {
  const result = await orderService.list(req.tenant.id, req.query);
  return paginated(res, result.rows, result.pagination);
}));

router.get('/orders/:id', requireScope('read'), asyncHandler(async (req, res) => {
  return success(res, await orderService.getById(req.tenant.id, req.params.id));
}));

router.post('/orders', requireScope('write'), asyncHandler(async (req, res) => {
  const order = await orderService.createPOSOrder(req.tenant.id, { ...req.body, order_type: 'online' }, null);
  return success(res, order, 'Order created', 201);
}));

// Customers
router.get('/customers', requireScope('read'), asyncHandler(async (req, res) => {
  const result = await customerService.list(req.tenant.id, req.query);
  return paginated(res, result.rows, result.pagination);
}));

module.exports = router;
