const router = require('express').Router();
const controller = require('./customers.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.customers'));

router.get('/', controller.list);
router.get('/:id/detail', controller.getDetail);
router.get('/:id/loyalty', controller.loyaltyHistory);
router.post('/:id/loyalty/redeem', controller.redeemLoyalty);
router.get('/:id', controller.getById);
router.post('/', auditLog('customer.create', 'customer'), controller.create);
router.put('/:id', auditLog('customer.update', 'customer'), controller.update);
router.delete('/:id', auditLog('customer.delete', 'customer'), controller.remove);

module.exports = router;
