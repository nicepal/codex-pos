const router = require('express').Router();
const controller = require('./settings.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.settings'));

router.get('/', controller.get);
router.put('/', auditLog('settings.update', 'tenant'), controller.update);

module.exports = router;
