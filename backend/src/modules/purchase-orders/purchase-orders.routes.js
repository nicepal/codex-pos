const router = require('express').Router();
const controller = require('./purchase-orders.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.inventory'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/pdf', controller.downloadPdf);
router.post('/', auditLog('purchase_order.create', 'purchase_order'), controller.create);
router.post('/:id/receive', requireFeature('inventory_pro'), auditLog('purchase_order.receive', 'purchase_order'), controller.receive);
router.patch('/:id/status', auditLog('purchase_order.status', 'purchase_order'), controller.updateStatus);
router.delete('/:id', auditLog('purchase_order.delete', 'purchase_order'), controller.remove);

module.exports = router;
