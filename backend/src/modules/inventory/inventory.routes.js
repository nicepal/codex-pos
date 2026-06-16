const router = require('express').Router();
const controller = require('./inventory.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.inventory'));

router.get('/', controller.list);
router.get('/low-stock', controller.lowStock);
router.post('/stock-in', controller.stockIn);
router.post('/stock-out', controller.stockOut);
router.post('/adjustment', controller.adjustment);
router.get('/stock-take', requireFeature('inventory_pro'), controller.listStockTake);
router.get('/stock-take/open', requireFeature('inventory_pro'), controller.getOpenStockTake);
router.get('/stock-take/:sessionId', requireFeature('inventory_pro'), controller.getStockTake);
router.post('/stock-take', requireFeature('inventory_pro'), controller.createStockTake);
router.post('/stock-take/:sessionId/lines', requireFeature('inventory_pro'), controller.addStockTakeLine);
router.post('/stock-take/:sessionId/complete', requireFeature('inventory_pro'), controller.completeStockTake);
router.post('/stock-take/:sessionId/cancel', requireFeature('inventory_pro'), controller.cancelStockTake);

module.exports = router;
