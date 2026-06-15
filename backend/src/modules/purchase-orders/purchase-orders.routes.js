const router = require('express').Router();
const controller = require('./purchase-orders.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.inventory'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', auditLog('purchase_order.create', 'purchase_order'), controller.create);
router.post('/:id/receive', auditLog('purchase_order.receive', 'purchase_order'), controller.receive);

module.exports = router;
