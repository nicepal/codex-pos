const router = require('express').Router();
const controller = require('./inventory.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.inventory'));

router.get('/', controller.list);
router.get('/low-stock', controller.lowStock);
router.post('/stock-in', controller.stockIn);
router.post('/stock-out', controller.stockOut);
router.post('/adjustment', controller.adjustment);

module.exports = router;
