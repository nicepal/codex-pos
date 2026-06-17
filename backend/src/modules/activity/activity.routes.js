const router = require('express').Router();
const controller = require('./activity.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('staff_pro'), authorize('business.settings'));

router.get('/', controller.list);

module.exports = router;
