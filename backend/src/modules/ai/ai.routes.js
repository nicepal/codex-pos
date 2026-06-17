const router = require('express').Router();
const controller = require('./ai.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');

router.use(authenticate, requireTenant, requireTenantAccess, authorize('business.reports'));

router.get('/reorder-suggestions', controller.reorder);
router.post('/insights', controller.ask);

module.exports = router;
