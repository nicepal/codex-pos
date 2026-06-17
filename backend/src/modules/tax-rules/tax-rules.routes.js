const router = require('express').Router();
const controller = require('./tax-rules.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('tax_advanced'), authorize('business.settings'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', auditLog('tax_rule.create', 'tax_rule'), controller.create);
router.put('/:id', auditLog('tax_rule.update', 'tax_rule'), controller.update);
router.delete('/:id', auditLog('tax_rule.delete', 'tax_rule'), controller.remove);

module.exports = router;
