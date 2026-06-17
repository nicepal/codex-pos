const router = require('express').Router();
const controller = require('./api-keys.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.settings'));

router.get('/', controller.list);
router.post('/', auditLog('api_key.create', 'api_key'), controller.create);
router.delete('/:id', auditLog('api_key.revoke', 'api_key'), controller.revoke);

module.exports = router;
