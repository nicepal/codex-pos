const router = require('express').Router();
const controller = require('./marketplace.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');
const { auditLog } = require('../../middleware/audit');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('omnichannel'), authorize('business.settings'));

router.get('/', controller.list);
router.post('/connect', auditLog('marketplace.connect', 'marketplace'), controller.connect);
router.delete('/:channel', auditLog('marketplace.disconnect', 'marketplace'), controller.disconnect);
router.post('/:channel/sync', auditLog('marketplace.sync', 'marketplace'), controller.sync);

module.exports = router;
