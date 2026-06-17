const router = require('express').Router();
const controller = require('./customers.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');
const { validate, Joi } = require('../../middleware/validate');
const { requireFeature } = require('../../middleware/features');
const { createCustomerSchema, updateCustomerSchema } = require('./customers.validation');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.customers'));

router.get('/', controller.list);
router.get('/:id/detail', controller.getDetail);
router.get('/:id/loyalty', requireFeature('crm_pro'), controller.loyaltyHistory);
router.post('/:id/loyalty/redeem', requireFeature('crm_pro'), controller.redeemLoyalty);
router.get('/:id', controller.getById);
router.post('/', auditLog('customer.create', 'customer'), validate(createCustomerSchema), controller.create);
router.put('/:id', auditLog('customer.update', 'customer'), validate(updateCustomerSchema), controller.update);
router.post('/:id/merge', validate(Joi.object({ merge_id: Joi.string().uuid().required() })), requireFeature('crm_pro'), controller.merge);
router.delete('/:id', auditLog('customer.delete', 'customer'), controller.remove);

module.exports = router;
