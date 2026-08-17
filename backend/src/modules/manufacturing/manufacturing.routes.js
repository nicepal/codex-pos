const router = require('express').Router();
const controller = require('./manufacturing.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(
  authenticate,
  requireTenant,
  requireTenantAccess,
  requireFeature('mfg_pro'),
  authorize('business.inventory', 'business.products')
);

router.get('/boms', controller.listBoms);
router.post('/boms', controller.createBom);
router.get('/boms/:id', controller.getBom);
router.put('/boms/:id', controller.updateBom);
router.delete('/boms/:id', controller.deleteBom);

router.get('/production-orders', controller.listProductionOrders);
router.post('/production-orders', controller.createProductionOrder);
router.post('/production-orders/:id/complete', controller.completeProductionOrder);

module.exports = router;
