const router = require('express').Router();
const controller = require('./transfers.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('inventory_pro'), authorize('business.inventory'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/:id/complete', controller.complete);

module.exports = router;
