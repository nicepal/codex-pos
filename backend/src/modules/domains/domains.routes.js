const router = require('express').Router();
const controller = require('./domains.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('omnichannel'), authorize('business.settings'));

router.get('/', controller.list);
router.post('/', auditLog('domain.create', 'domain'), controller.create);
router.post('/:id/verify', auditLog('domain.verify', 'domain'), controller.verify);
router.delete('/:id', auditLog('domain.delete', 'domain'), controller.remove);

module.exports = router;
