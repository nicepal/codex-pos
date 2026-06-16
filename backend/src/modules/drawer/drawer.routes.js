const router = require('express').Router();
const controller = require('./drawer.controller');
const { authenticate, authorize, requireTenantAccess } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenant');
const { requireFeature } = require('../../middleware/features');

router.use(authenticate, requireTenant, requireTenantAccess, requireFeature('staff_pro'), authorize('business.pos'));

router.get('/open', controller.listOpen);
router.post('/open', controller.open);
router.post('/:id/close', controller.close);

module.exports = router;
